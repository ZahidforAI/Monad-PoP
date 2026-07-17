// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MonadPoP — Monad Proof of Purchase
 * @notice Merchant-issued, blockchain-verifiable purchase credential system.
 * @dev This contract stores non-transferable purchase proofs. It does NOT store PII.
 *      Only hashed receipt data and identifiers are committed on-chain.
 */
contract MonadPoP is AccessControl {
    // -------------------------------------------------------
    // Roles
    // -------------------------------------------------------
    bytes32 public constant MERCHANT_ROLE = keccak256("MERCHANT_ROLE");

    // -------------------------------------------------------
    // Enums
    // -------------------------------------------------------
    enum ReceiptStatus {
        Active,
        Returned,
        Refunded,
        Replaced,
        Revoked
    }

    // -------------------------------------------------------
    // Structs
    // -------------------------------------------------------
    struct PurchaseProof {
        uint256 id;
        bytes32 receiptHash;
        bytes32 productId;
        address merchant;
        address buyer;
        uint64 purchasedAt;
        uint64 warrantyUntil;
        ReceiptStatus status;
    }

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------
    uint256 private _nextReceiptId = 1;
    mapping(uint256 => PurchaseProof) private _receipts;
    mapping(bytes32 => bool) private _usedHashes;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------
    event ReceiptIssued(
        uint256 indexed receiptId,
        address indexed merchant,
        address indexed buyer,
        bytes32 productId,
        bytes32 receiptHash
    );

    event ReceiptStatusChanged(
        uint256 indexed receiptId,
        ReceiptStatus previousStatus,
        ReceiptStatus newStatus
    );

    event ReceiptReplaced(
        uint256 indexed oldReceiptId,
        uint256 indexed newReceiptId
    );

    // -------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------
    error ZeroBuyerAddress();
    error ZeroReceiptHash();
    error ZeroProductId();
    error DuplicateReceiptHash(bytes32 hash);
    error ReceiptNotFound(uint256 receiptId);
    error NotIssuingMerchant(uint256 receiptId, address caller);
    error InvalidStatusTransition(ReceiptStatus current, ReceiptStatus requested);
    error PurchaseDateTooFarInFuture(uint64 purchasedAt);
    error WarrantyBeforePurchase(uint64 warrantyUntil, uint64 purchasedAt);
    error BuyerCannotModifyReceipt();
    error ReceiptAlreadyFinalized(uint256 receiptId, ReceiptStatus currentStatus);

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -------------------------------------------------------
    // Write functions
    // -------------------------------------------------------

    /**
     * @notice Issue a new purchase proof credential.
     * @param buyer         Wallet receiving the credential.
     * @param productId     Hashed product identifier.
     * @param receiptHash   Keccak-256 hash of the canonical receipt JSON.
     * @param purchasedAt   Unix timestamp of purchase.
     * @param warrantyUntil Unix timestamp of warranty expiry (0 if none).
     * @return receiptId    The sequential on-chain receipt ID.
     */
    function issueReceipt(
        address buyer,
        bytes32 productId,
        bytes32 receiptHash,
        uint64 purchasedAt,
        uint64 warrantyUntil
    ) external onlyRole(MERCHANT_ROLE) returns (uint256 receiptId) {
        if (buyer == address(0)) revert ZeroBuyerAddress();
        if (receiptHash == bytes32(0)) revert ZeroReceiptHash();
        if (productId == bytes32(0)) revert ZeroProductId();
        if (_usedHashes[receiptHash]) revert DuplicateReceiptHash(receiptHash);
        // Allow up to 1 hour in the future for clock drift
        if (purchasedAt > uint64(block.timestamp) + 3600)
            revert PurchaseDateTooFarInFuture(purchasedAt);
        if (warrantyUntil != 0 && warrantyUntil < purchasedAt)
            revert WarrantyBeforePurchase(warrantyUntil, purchasedAt);

        receiptId = _nextReceiptId++;
        _usedHashes[receiptHash] = true;

        _receipts[receiptId] = PurchaseProof({
            id: receiptId,
            receiptHash: receiptHash,
            productId: productId,
            merchant: msg.sender,
            buyer: buyer,
            purchasedAt: purchasedAt,
            warrantyUntil: warrantyUntil,
            status: ReceiptStatus.Active
        });

        emit ReceiptIssued(receiptId, msg.sender, buyer, productId, receiptHash);
    }

    /**
     * @notice Update the status of a receipt.
     * @dev Only the issuing merchant can update; cannot revert to Active from a final state.
     */
    function updateReceiptStatus(
        uint256 receiptId,
        ReceiptStatus newStatus
    ) external {
        PurchaseProof storage proof = _getExistingReceipt(receiptId);

        if (msg.sender != proof.merchant)
            revert NotIssuingMerchant(receiptId, msg.sender);

        _validateStatusTransition(receiptId, proof.status, newStatus);

        ReceiptStatus previousStatus = proof.status;
        proof.status = newStatus;

        emit ReceiptStatusChanged(receiptId, previousStatus, newStatus);
    }

    /**
     * @notice Replace an existing receipt with a corrected one.
     * @dev Marks the old receipt as Replaced and creates a new one.
     */
    function replaceReceipt(
        uint256 oldReceiptId,
        bytes32 newReceiptHash,
        uint64 newWarrantyUntil
    ) external onlyRole(MERCHANT_ROLE) returns (uint256 newReceiptId) {
        PurchaseProof storage oldProof = _getExistingReceipt(oldReceiptId);

        if (msg.sender != oldProof.merchant)
            revert NotIssuingMerchant(oldReceiptId, msg.sender);

        if (oldProof.status != ReceiptStatus.Active)
            revert ReceiptAlreadyFinalized(oldReceiptId, oldProof.status);

        if (newReceiptHash == bytes32(0)) revert ZeroReceiptHash();
        if (_usedHashes[newReceiptHash]) revert DuplicateReceiptHash(newReceiptHash);
        if (newWarrantyUntil != 0 && newWarrantyUntil < oldProof.purchasedAt)
            revert WarrantyBeforePurchase(newWarrantyUntil, oldProof.purchasedAt);

        // Mark old receipt as replaced
        ReceiptStatus prevStatus = oldProof.status;
        oldProof.status = ReceiptStatus.Replaced;
        emit ReceiptStatusChanged(oldReceiptId, prevStatus, ReceiptStatus.Replaced);

        // Create replacement
        newReceiptId = _nextReceiptId++;
        _usedHashes[newReceiptHash] = true;

        _receipts[newReceiptId] = PurchaseProof({
            id: newReceiptId,
            receiptHash: newReceiptHash,
            productId: oldProof.productId,
            merchant: msg.sender,
            buyer: oldProof.buyer,
            purchasedAt: oldProof.purchasedAt,
            warrantyUntil: newWarrantyUntil,
            status: ReceiptStatus.Active
        });

        emit ReceiptIssued(
            newReceiptId,
            msg.sender,
            oldProof.buyer,
            oldProof.productId,
            newReceiptHash
        );
        emit ReceiptReplaced(oldReceiptId, newReceiptId);
    }

    // -------------------------------------------------------
    // View functions
    // -------------------------------------------------------

    function getReceipt(
        uint256 receiptId
    ) external view returns (PurchaseProof memory) {
        return _getExistingReceipt(receiptId);
    }

    function receiptExists(uint256 receiptId) external view returns (bool) {
        return _receipts[receiptId].merchant != address(0);
    }

    function verifyReceiptHash(
        uint256 receiptId,
        bytes32 candidateHash
    ) external view returns (bool) {
        PurchaseProof storage proof = _getExistingReceipt(receiptId);
        return proof.receiptHash == candidateHash;
    }

    function nextReceiptId() external view returns (uint256) {
        return _nextReceiptId;
    }

    // -------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------

    function _getExistingReceipt(
        uint256 receiptId
    ) internal view returns (PurchaseProof storage) {
        PurchaseProof storage proof = _receipts[receiptId];
        if (proof.merchant == address(0)) revert ReceiptNotFound(receiptId);
        return proof;
    }

    function _validateStatusTransition(
        uint256 receiptId,
        ReceiptStatus current,
        ReceiptStatus requested
    ) internal pure {
        // Already finalized states cannot be changed
        if (
            current == ReceiptStatus.Returned ||
            current == ReceiptStatus.Refunded ||
            current == ReceiptStatus.Replaced ||
            current == ReceiptStatus.Revoked
        ) {
            revert ReceiptAlreadyFinalized(receiptId, current);
        }

        // Cannot transition to the same status
        if (current == requested)
            revert InvalidStatusTransition(current, requested);

        // Cannot go back to Active from any finalized state
        if (requested == ReceiptStatus.Active)
            revert InvalidStatusTransition(current, requested);
    }
}
