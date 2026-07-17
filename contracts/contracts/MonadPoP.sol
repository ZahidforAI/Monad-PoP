// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MonadPoP — Monad Proof of Purchase & Product Passport Marketplace
 * @notice Privacy-focused physical-product marketplace and Product Passport system on Monad.
 */
contract MonadPoP is AccessControl, ReentrancyGuard {
    // -------------------------------------------------------
    // Roles
    // -------------------------------------------------------
    bytes32 public constant MERCHANT_ROLE = keccak256("MERCHANT_ROLE");

    // -------------------------------------------------------
    // Enums
    // -------------------------------------------------------
    enum PassportStatus {
        Active,
        Returned,
        Refunded,
        Replaced,
        Revoked
    }

    enum ListingStatus {
        Active,
        Requested,
        Accepted,
        Completed,
        Cancelled
    }

    // -------------------------------------------------------
    // Structs
    // -------------------------------------------------------
    struct ProductPassport {
        uint256 id;
        bytes32 productId;
        bytes32 originalReceiptHash;
        address merchant;
        address originalBuyer;
        address currentOwner;
        uint64 purchasedAt;
        uint64 warrantyUntil;
        PassportStatus status;
    }

    struct Listing {
        uint256 id;
        uint256 passportId;
        address seller;
        address buyer;
        uint256 price;
        bytes32 metadataHash;
        bytes32 saleProofHash;
        uint64 createdAt;
        uint64 acceptedAt;
        uint64 completedAt;
        ListingStatus status;
    }

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------
    uint256 private _nextReceiptId = 1;
    uint256 private _nextListingId = 1;

    mapping(uint256 => ProductPassport) private _receipts;
    mapping(bytes32 => bool) private _usedHashes;

    mapping(uint256 => Listing) private _listings;
    mapping(uint256 => uint256) private _activeListingByPassport; // passportId => listingId

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------
    event PassportIssued(
        uint256 indexed passportId,
        address indexed merchant,
        address indexed buyer,
        bytes32 productId,
        bytes32 receiptHash
    );

    event PassportStatusChanged(
        uint256 indexed passportId,
        PassportStatus previousStatus,
        PassportStatus newStatus
    );

    event PassportReplaced(
        uint256 indexed oldPassportId,
        uint256 indexed newPassportId
    );

    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed passportId,
        address indexed seller,
        uint256 price,
        bytes32 metadataHash
    );

    event ListingCancelled(uint256 indexed listingId);

    event PurchaseRequested(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 price
    );

    event PurchaseAccepted(uint256 indexed listingId);

    event PurchaseRejected(uint256 indexed listingId);

    event PurchaseRequestCancelled(uint256 indexed listingId);

    event SaleCompleted(
        uint256 indexed listingId,
        address indexed buyer,
        bytes32 saleProofHash
    );

    event PassportTransferred(
        uint256 indexed passportId,
        address indexed from,
        address indexed to
    );

    event EscrowRefunded(
        uint256 indexed listingId,
        address indexed recipient,
        uint256 amount
    );

    // -------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------
    error ZeroBuyerAddress();
    error ZeroReceiptHash();
    error ZeroProductId();
    error DuplicateReceiptHash(bytes32 hash);
    error PassportNotFound(uint256 passportId);
    error NotIssuingMerchant(uint256 passportId, address caller);
    error InvalidStatusTransition(PassportStatus current, PassportStatus requested);
    error PurchaseDateTooFarInFuture(uint64 purchasedAt);
    error WarrantyBeforePurchase(uint64 warrantyUntil, uint64 purchasedAt);
    error PassportAlreadyFinalized(uint256 passportId, PassportStatus currentStatus);

    error NotPassportOwner(uint256 passportId, address caller);
    error PassportNotActive(uint256 passportId, PassportStatus status);
    error InvalidListingPrice();
    error SellerCannotBeBuyer();
    error IncorrectMONValue(uint256 expected, uint256 actual);
    error ListingNotActive(uint256 listingId, ListingStatus status);
    error ListingNotRequested(uint256 listingId, ListingStatus status);
    error ListingNotAccepted(uint256 listingId, ListingStatus status);
    error NotListingSeller(uint256 listingId, address caller);
    error NotListingBuyer(uint256 listingId, address caller);
    error DuplicateActiveListing(uint256 passportId);
    error NativeTransferFailed();
    error ListingLocked(uint256 listingId);
    error EscrowNotStuck(uint256 listingId);

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -------------------------------------------------------
    // Passport Functions
    // -------------------------------------------------------

    /**
     * @notice Issue a new Product Passport credential.
     */
    function issuePassport(
        address buyer,
        bytes32 productId,
        bytes32 receiptHash,
        uint64 purchasedAt,
        uint64 warrantyUntil
    ) public onlyRole(MERCHANT_ROLE) returns (uint256 passportId) {
        if (buyer == address(0)) revert ZeroBuyerAddress();
        if (receiptHash == bytes32(0)) revert ZeroReceiptHash();
        if (productId == bytes32(0)) revert ZeroProductId();
        if (_usedHashes[receiptHash]) revert DuplicateReceiptHash(receiptHash);
        if (purchasedAt > uint64(block.timestamp) + 3600)
            revert PurchaseDateTooFarInFuture(purchasedAt);
        if (warrantyUntil != 0 && warrantyUntil < purchasedAt)
            revert WarrantyBeforePurchase(warrantyUntil, purchasedAt);

        passportId = _nextReceiptId++;
        _usedHashes[receiptHash] = true;

        _receipts[passportId] = ProductPassport({
            id: passportId,
            productId: productId,
            originalReceiptHash: receiptHash,
            merchant: msg.sender,
            originalBuyer: buyer,
            currentOwner: buyer,
            purchasedAt: purchasedAt,
            warrantyUntil: warrantyUntil,
            status: PassportStatus.Active
        });

        emit PassportIssued(passportId, msg.sender, buyer, productId, receiptHash);
        emit PassportTransferred(passportId, address(0), buyer);
    }

    /**
     * @notice Get Product Passport details.
     */
    function getPassport(
        uint256 passportId
    ) public view returns (ProductPassport memory) {
        return _getExistingPassport(passportId);
    }

    /**
     * @notice Verify if a receipt hash matches the passport.
     */
    function verifyReceiptHash(
        uint256 passportId,
        bytes32 candidateHash
    ) external view returns (bool) {
        ProductPassport storage passport = _getExistingPassport(passportId);
        return passport.originalReceiptHash == candidateHash;
    }

    /**
     * @notice Update passport status. Only merchant can do this.
     */
    function updatePassportStatus(
        uint256 passportId,
        PassportStatus newStatus
    ) public {
        ProductPassport storage passport = _getExistingPassport(passportId);

        if (msg.sender != passport.merchant)
            revert NotIssuingMerchant(passportId, msg.sender);

        _validateStatusTransition(passportId, passport.status, newStatus);

        PassportStatus previousStatus = passport.status;
        passport.status = newStatus;

        emit PassportStatusChanged(passportId, previousStatus, newStatus);

        // Cancel any active listing for the passport if the status goes inactive
        if (newStatus != PassportStatus.Active) {
            uint256 activeListingId = _activeListingByPassport[passportId];
            if (activeListingId != 0) {
                Listing storage listing = _listings[activeListingId];
                if (listing.status == ListingStatus.Requested || listing.status == ListingStatus.Accepted) {
                    address buyerToRefund = listing.buyer;
                    uint256 refundAmount = listing.price;
                    
                    listing.buyer = address(0);
                    listing.status = ListingStatus.Cancelled;
                    
                    (bool success, ) = buyerToRefund.call{value: refundAmount}("");
                    if (!success) revert NativeTransferFailed();
                    emit EscrowRefunded(activeListingId, buyerToRefund, refundAmount);
                } else {
                    listing.status = ListingStatus.Cancelled;
                }
                _activeListingByPassport[passportId] = 0;
                emit ListingCancelled(activeListingId);
            }
        }
    }

    /**
     * @notice Replace a passport with a corrected one.
     */
    function replacePassport(
        uint256 oldPassportId,
        bytes32 newReceiptHash,
        uint64 newWarrantyUntil
    ) public onlyRole(MERCHANT_ROLE) returns (uint256 newPassportId) {
        ProductPassport storage oldPassport = _getExistingPassport(oldPassportId);

        if (msg.sender != oldPassport.merchant)
            revert NotIssuingMerchant(oldPassportId, msg.sender);

        if (oldPassport.status != PassportStatus.Active)
            revert PassportAlreadyFinalized(oldPassportId, oldPassport.status);

        if (newReceiptHash == bytes32(0)) revert ZeroReceiptHash();
        if (_usedHashes[newReceiptHash]) revert DuplicateReceiptHash(newReceiptHash);
        if (newWarrantyUntil != 0 && newWarrantyUntil < oldPassport.purchasedAt)
            revert WarrantyBeforePurchase(newWarrantyUntil, oldPassport.purchasedAt);

        // Mark old passport as Replaced
        PassportStatus prevStatus = oldPassport.status;
        oldPassport.status = PassportStatus.Replaced;
        emit PassportStatusChanged(oldPassportId, prevStatus, PassportStatus.Replaced);

        // Create replacement passport
        newPassportId = _nextReceiptId++;
        _usedHashes[newReceiptHash] = true;

        _receipts[newPassportId] = ProductPassport({
            id: newPassportId,
            productId: oldPassport.productId,
            originalReceiptHash: newReceiptHash,
            merchant: msg.sender,
            originalBuyer: oldPassport.originalBuyer,
            currentOwner: oldPassport.currentOwner,
            purchasedAt: oldPassport.purchasedAt,
            warrantyUntil: newWarrantyUntil,
            status: PassportStatus.Active
        });

        emit PassportIssued(
            newPassportId,
            msg.sender,
            oldPassport.currentOwner,
            oldPassport.productId,
            newReceiptHash
        );
        emit PassportReplaced(oldPassportId, newPassportId);
    }

    /**
     * @notice Check if passport exists.
     */
    function passportExists(uint256 passportId) public view returns (bool) {
        return _receipts[passportId].merchant != address(0);
    }

    /**
     * @notice Get current owner of passport.
     */
    function currentOwnerOf(uint256 passportId) external view returns (address) {
        ProductPassport storage passport = _getExistingPassport(passportId);
        return passport.currentOwner;
    }

    // -------------------------------------------------------
    // Marketplace Functions
    // -------------------------------------------------------

    /**
     * @notice Create a listing for an owned passport.
     */
    function createListing(
        uint256 passportId,
        uint256 price,
        bytes32 metadataHash
    ) external returns (uint256 listingId) {
        ProductPassport storage passport = _getExistingPassport(passportId);

        if (passport.currentOwner != msg.sender) revert NotPassportOwner(passportId, msg.sender);
        if (passport.status != PassportStatus.Active) revert PassportNotActive(passportId, passport.status);
        if (price == 0) revert InvalidListingPrice();
        if (_activeListingByPassport[passportId] != 0) revert DuplicateActiveListing(passportId);

        listingId = _nextListingId++;

        _listings[listingId] = Listing({
            id: listingId,
            passportId: passportId,
            seller: msg.sender,
            buyer: address(0),
            price: price,
            metadataHash: metadataHash,
            saleProofHash: bytes32(0),
            createdAt: uint64(block.timestamp),
            acceptedAt: 0,
            completedAt: 0,
            status: ListingStatus.Active
        });

        _activeListingByPassport[passportId] = listingId;

        emit ListingCreated(listingId, passportId, msg.sender, price, metadataHash);
    }

    /**
     * @notice Cancel an active listing.
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = _listings[listingId];
        if (listing.id == 0) revert ListingNotActive(listingId, ListingStatus.Cancelled);
        if (listing.seller != msg.sender) revert NotListingSeller(listingId, msg.sender);
        if (listing.status != ListingStatus.Active) revert ListingNotActive(listingId, listing.status);

        listing.status = ListingStatus.Cancelled;
        _activeListingByPassport[listing.passportId] = 0;

        emit ListingCancelled(listingId);
    }

    /**
     * @notice Fund a purchase request on an active listing.
     */
    function requestPurchase(uint256 listingId) external payable nonReentrant {
        Listing storage listing = _listings[listingId];
        if (listing.id == 0) revert ListingNotActive(listingId, ListingStatus.Cancelled);
        if (listing.status != ListingStatus.Active) revert ListingNotActive(listingId, listing.status);
        if (listing.seller == msg.sender) revert SellerCannotBeBuyer();
        if (msg.value != listing.price) revert IncorrectMONValue(listing.price, msg.value);

        listing.buyer = msg.sender;
        listing.status = ListingStatus.Requested;

        emit PurchaseRequested(listingId, msg.sender, msg.value);
    }

    /**
     * @notice Accept a funded purchase request.
     */
    function acceptPurchaseRequest(uint256 listingId) external {
        Listing storage listing = _listings[listingId];
        if (listing.seller != msg.sender) revert NotListingSeller(listingId, msg.sender);
        if (listing.status != ListingStatus.Requested) revert ListingNotRequested(listingId, listing.status);

        listing.status = ListingStatus.Accepted;
        listing.acceptedAt = uint64(block.timestamp);

        emit PurchaseAccepted(listingId);
    }

    /**
     * @notice Reject a funded purchase request, refunding the buyer.
     */
    function rejectPurchaseRequest(uint256 listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];
        if (listing.seller != msg.sender) revert NotListingSeller(listingId, msg.sender);
        if (listing.status != ListingStatus.Requested) revert ListingNotRequested(listingId, listing.status);

        address buyerToRefund = listing.buyer;
        uint256 refundAmount = listing.price;

        // Reset status before transfer (checks-effects-interactions)
        listing.buyer = address(0);
        listing.status = ListingStatus.Active;

        (bool success, ) = buyerToRefund.call{value: refundAmount}("");
        if (!success) revert NativeTransferFailed();

        emit PurchaseRejected(listingId);
        emit EscrowRefunded(listingId, buyerToRefund, refundAmount);
    }

    /**
     * @notice Cancel a funded purchase request before it is accepted, refunding the buyer.
     */
    function cancelPurchaseRequest(uint256 listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];
        if (listing.buyer != msg.sender) revert NotListingBuyer(listingId, msg.sender);
        if (listing.status != ListingStatus.Requested) revert ListingNotRequested(listingId, listing.status);

        address buyerToRefund = listing.buyer;
        uint256 refundAmount = listing.price;

        // Reset status before transfer
        listing.buyer = address(0);
        listing.status = ListingStatus.Active;

        (bool success, ) = buyerToRefund.call{value: refundAmount}("");
        if (!success) revert NativeTransferFailed();

        emit PurchaseRequestCancelled(listingId);
        emit EscrowRefunded(listingId, buyerToRefund, refundAmount);
    }

    /**
     * @notice Confirm receipt/delivery of product, settling payment and transferring passport.
     */
    function confirmReceived(uint256 listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];
        if (listing.buyer != msg.sender) revert NotListingBuyer(listingId, msg.sender);
        if (listing.status != ListingStatus.Accepted) revert ListingNotAccepted(listingId, listing.status);

        ProductPassport storage passport = _receipts[listing.passportId];
        address previousOwner = passport.currentOwner;

        // Calculate deterministic proof hash
        bytes32 proofHash = keccak256(
            abi.encodePacked(
                block.chainid,
                listingId,
                listing.passportId,
                listing.seller,
                listing.buyer,
                listing.price,
                passport.productId,
                uint64(block.timestamp)
            )
        );

        // Update state before transfer
        listing.status = ListingStatus.Completed;
        listing.completedAt = uint64(block.timestamp);
        listing.saleProofHash = proofHash;
        
        passport.currentOwner = listing.buyer;
        _activeListingByPassport[listing.passportId] = 0;

        uint256 settlementAmount = listing.price;
        (bool success, ) = listing.seller.call{value: settlementAmount}("");
        if (!success) revert NativeTransferFailed();

        emit SaleCompleted(listingId, listing.buyer, proofHash);
        emit PassportTransferred(listing.passportId, previousOwner, listing.buyer);
    }

    /**
     * @notice Get listing details.
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        Listing storage listing = _listings[listingId];
        if (listing.id == 0) revert ListingNotActive(listingId, ListingStatus.Cancelled);
        return listing;
    }

    /**
     * @notice Admin-resolution mechanism to resolve a stuck escrow.
     */
    function resolveStuckEscrow(uint256 listingId, bool refundBuyer) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        Listing storage listing = _listings[listingId];
        if (listing.status != ListingStatus.Requested && listing.status != ListingStatus.Accepted) {
            revert EscrowNotStuck(listingId);
        }

        uint256 amount = listing.price;
        address recipient = refundBuyer ? listing.buyer : listing.seller;

        listing.buyer = address(0);
        listing.status = ListingStatus.Active;
        listing.acceptedAt = 0;

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert NativeTransferFailed();

        emit EscrowRefunded(listingId, recipient, amount);
    }

    // -------------------------------------------------------
    // Backward Compatibility Aliases
    // -------------------------------------------------------
    function issueReceipt(
        address buyer,
        bytes32 productId,
        bytes32 receiptHash,
        uint64 purchasedAt,
        uint64 warrantyUntil
    ) external returns (uint256) {
        return issuePassport(buyer, productId, receiptHash, purchasedAt, warrantyUntil);
    }

    function getReceipt(uint256 receiptId) external view returns (ProductPassport memory) {
        return getPassport(receiptId);
    }

    function receiptExists(uint256 receiptId) external view returns (bool) {
        return passportExists(receiptId);
    }

    function updateReceiptStatus(uint256 receiptId, PassportStatus newStatus) external {
        updatePassportStatus(receiptId, newStatus);
    }

    // -------------------------------------------------------
    // Internal Helpers
    // -------------------------------------------------------
    function _getExistingPassport(
        uint256 passportId
    ) internal view returns (ProductPassport storage) {
        ProductPassport storage passport = _receipts[passportId];
        if (passport.merchant == address(0)) revert PassportNotFound(passportId);
        return passport;
    }

    function _validateStatusTransition(
        uint256 passportId,
        PassportStatus current,
        PassportStatus requested
    ) internal pure {
        if (
            current == PassportStatus.Returned ||
            current == PassportStatus.Refunded ||
            current == PassportStatus.Replaced ||
            current == PassportStatus.Revoked
        ) {
            revert PassportAlreadyFinalized(passportId, current);
        }
        if (current == requested) revert InvalidStatusTransition(current, requested);
        if (requested == PassportStatus.Active) revert InvalidStatusTransition(current, requested);
    }
}
