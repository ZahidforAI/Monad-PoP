import { expect } from "chai";
import hre from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("MonadPoP", function () {
  async function deployFixture() {
    const [deployer, merchant, merchant2, buyer, buyer2, unauthorized] =
      await hre.ethers.getSigners();

    const MonadPoP = await hre.ethers.getContractFactory("MonadPoP");
    const contract = await MonadPoP.deploy();
    await contract.waitForDeployment();

    const MERCHANT_ROLE = await contract.MERCHANT_ROLE();
    const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();

    const sampleHash = hre.ethers.id("sample-receipt-data");
    const sampleProductId = hre.ethers.id("product-001");
    const now = BigInt(await time.latest());
    const purchasedAt = now;
    const warrantyUntil = now + BigInt(365 * 24 * 3600); // 1 year

    return {
      contract,
      deployer,
      merchant,
      merchant2,
      buyer,
      buyer2,
      unauthorized,
      MERCHANT_ROLE,
      DEFAULT_ADMIN_ROLE,
      sampleHash,
      sampleProductId,
      purchasedAt,
      warrantyUntil,
    };
  }

  describe("Deployment & Roles", function () {
    it("deployer receives DEFAULT_ADMIN_ROLE", async function () {
      const { contract, deployer, DEFAULT_ADMIN_ROLE } =
        await loadFixture(deployFixture);
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("admin can grant and revoke MERCHANT_ROLE", async function () {
      const { contract, deployer, merchant, MERCHANT_ROLE } =
        await loadFixture(deployFixture);
      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);
      expect(await contract.hasRole(MERCHANT_ROLE, merchant.address)).to.be.true;

      await contract.connect(deployer).revokeRole(MERCHANT_ROLE, merchant.address);
      expect(await contract.hasRole(MERCHANT_ROLE, merchant.address)).to.be.false;
    });
  });

  describe("Passport Functions", function () {
    it("merchant-only issuance", async function () {
      const {
        contract,
        deployer,
        merchant,
        buyer,
        sampleHash,
        sampleProductId,
        purchasedAt,
        warrantyUntil,
        MERCHANT_ROLE,
      } = await loadFixture(deployFixture);

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);

      await expect(
        contract.connect(merchant).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil)
      ).to.emit(contract, "PassportIssued").withArgs(1, merchant.address, buyer.address, sampleProductId, sampleHash);
    });

    it("unauthorized issuance fails", async function () {
      const {
        contract,
        unauthorized,
        buyer,
        sampleHash,
        sampleProductId,
        purchasedAt,
        warrantyUntil,
      } = await loadFixture(deployFixture);

      await expect(
        contract.connect(unauthorized).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil)
      ).to.be.reverted;
    });

    it("duplicate receipt hash fails", async function () {
      const {
        contract,
        deployer,
        merchant,
        buyer,
        buyer2,
        sampleHash,
        sampleProductId,
        purchasedAt,
        warrantyUntil,
        MERCHANT_ROLE,
      } = await loadFixture(deployFixture);

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);
      await contract.connect(merchant).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil);

      await expect(
        contract.connect(merchant).issuePassport(buyer2.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil)
      ).to.be.revertedWithCustomError(contract, "DuplicateReceiptHash");
    });

    it("invalid buyer address fails", async function () {
      const {
        contract,
        deployer,
        merchant,
        sampleHash,
        sampleProductId,
        purchasedAt,
        warrantyUntil,
        MERCHANT_ROLE,
      } = await loadFixture(deployFixture);

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);

      await expect(
        contract.connect(merchant).issuePassport("0x0000000000000000000000000000000000000000", sampleProductId, sampleHash, purchasedAt, warrantyUntil)
      ).to.be.revertedWithCustomError(contract, "ZeroBuyerAddress");
    });

    it("invalid warranty timestamp fails", async function () {
      const {
        contract,
        deployer,
        merchant,
        buyer,
        sampleHash,
        sampleProductId,
        purchasedAt,
        MERCHANT_ROLE,
      } = await loadFixture(deployFixture);

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);

      await expect(
        contract.connect(merchant).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, purchasedAt - 10n)
      ).to.be.revertedWithCustomError(contract, "WarrantyBeforePurchase");
    });

    it("status transitions & revocation", async function () {
      const {
        contract,
        deployer,
        merchant,
        buyer,
        sampleHash,
        sampleProductId,
        purchasedAt,
        warrantyUntil,
        MERCHANT_ROLE,
      } = await loadFixture(deployFixture);

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);
      await contract.connect(merchant).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil);

      // Status change by merchant to Returned
      await expect(contract.connect(merchant).updatePassportStatus(1, 1)) // 1 is Returned
        .to.emit(contract, "PassportStatusChanged").withArgs(1, 0, 1);

      // Verify status cannot transition further once finalized
      await expect(
        contract.connect(merchant).updatePassportStatus(1, 4) // 4 is Revoked
      ).to.be.revertedWithCustomError(contract, "PassportAlreadyFinalized");
    });

    it("replacement marks old replaced and issues new", async function () {
      const {
        contract,
        deployer,
        merchant,
        buyer,
        sampleHash,
        sampleProductId,
        purchasedAt,
        warrantyUntil,
        MERCHANT_ROLE,
      } = await loadFixture(deployFixture);

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);
      await contract.connect(merchant).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil);

      const newHash = hre.ethers.id("new-hash");

      await expect(contract.connect(merchant).replacePassport(1, newHash, warrantyUntil))
        .to.emit(contract, "PassportReplaced").withArgs(1, 2)
        .and.to.emit(contract, "PassportStatusChanged").withArgs(1, 0, 3); // 3 is Replaced

      const oldPassport = await contract.getPassport(1);
      expect(oldPassport.status).to.equal(3); // Replaced

      const newPassport = await contract.getPassport(2);
      expect(newPassport.status).to.equal(0); // Active
      expect(newPassport.originalReceiptHash).to.equal(newHash);
    });

    it("hash verification and existence", async function () {
      const {
        contract,
        deployer,
        merchant,
        buyer,
        sampleHash,
        sampleProductId,
        purchasedAt,
        warrantyUntil,
        MERCHANT_ROLE,
      } = await loadFixture(deployFixture);

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);
      await contract.connect(merchant).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil);

      expect(await contract.passportExists(1)).to.be.true;
      expect(await contract.passportExists(999)).to.be.false;

      expect(await contract.verifyReceiptHash(1, sampleHash)).to.be.true;
      expect(await contract.verifyReceiptHash(1, hre.ethers.id("bad-hash"))).to.be.false;
    });
  });

  describe("Marketplace Listings", function () {
    async function issuedPassportFixture() {
      const fixture = await loadFixture(deployFixture);
      const { contract, deployer, merchant, buyer, sampleHash, sampleProductId, purchasedAt, warrantyUntil, MERCHANT_ROLE } = fixture;

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);
      await contract.connect(merchant).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil);

      const listingMetadata = hre.ethers.id("listing-metadata");

      return {
        ...fixture,
        listingMetadata,
      };
    }

    it("current owner can create active listing", async function () {
      const { contract, buyer, listingMetadata } = await loadFixture(issuedPassportFixture);

      await expect(contract.connect(buyer).createListing(1, hre.ethers.parseEther("10"), listingMetadata))
        .to.emit(contract, "ListingCreated")
        .withArgs(1, 1, buyer.address, hre.ethers.parseEther("10"), listingMetadata);

      const listing = await contract.getListing(1);
      expect(listing.seller).to.equal(buyer.address);
      expect(listing.price).to.equal(hre.ethers.parseEther("10"));
      expect(listing.status).to.equal(0); // Active
    });

    it("non-owner cannot list", async function () {
      const { contract, unauthorized, listingMetadata } = await loadFixture(issuedPassportFixture);

      await expect(
        contract.connect(unauthorized).createListing(1, hre.ethers.parseEther("10"), listingMetadata)
      ).to.be.revertedWithCustomError(contract, "NotPassportOwner");
    });

    it("inactive passport cannot be listed", async function () {
      const { contract, merchant, buyer, listingMetadata } = await loadFixture(issuedPassportFixture);

      // Merchant updates passport status to Revoked (4)
      await contract.connect(merchant).updatePassportStatus(1, 4);

      await expect(
        contract.connect(buyer).createListing(1, hre.ethers.parseEther("10"), listingMetadata)
      ).to.be.revertedWithCustomError(contract, "PassportNotActive");
    });

    it("zero price listing fails", async function () {
      const { contract, buyer, listingMetadata } = await loadFixture(issuedPassportFixture);

      await expect(
        contract.connect(buyer).createListing(1, 0, listingMetadata)
      ).to.be.revertedWithCustomError(contract, "InvalidListingPrice");
    });

    it("duplicate active listing fails", async function () {
      const { contract, buyer, listingMetadata } = await loadFixture(issuedPassportFixture);

      await contract.connect(buyer).createListing(1, hre.ethers.parseEther("10"), listingMetadata);

      await expect(
        contract.connect(buyer).createListing(1, hre.ethers.parseEther("15"), listingMetadata)
      ).to.be.revertedWithCustomError(contract, "DuplicateActiveListing");
    });

    it("owner can cancel active listing", async function () {
      const { contract, buyer, listingMetadata } = await loadFixture(issuedPassportFixture);

      await contract.connect(buyer).createListing(1, hre.ethers.parseEther("10"), listingMetadata);

      await expect(contract.connect(buyer).cancelListing(1))
        .to.emit(contract, "ListingCancelled")
        .withArgs(1);

      const listing = await contract.getListing(1);
      expect(listing.status).to.equal(4); // Cancelled
    });

    it("unauthorized cancellation fails", async function () {
      const { contract, buyer, unauthorized, listingMetadata } = await loadFixture(issuedPassportFixture);

      await contract.connect(buyer).createListing(1, hre.ethers.parseEther("10"), listingMetadata);

      await expect(
        contract.connect(unauthorized).cancelListing(1)
      ).to.be.revertedWithCustomError(contract, "NotListingSeller");
    });
  });

  describe("Purchase Requests & Escrow", function () {
    async function listedPassportFixture() {
      const fixture = await loadFixture(deployFixture);
      const { contract, deployer, merchant, buyer, buyer2, sampleHash, sampleProductId, purchasedAt, warrantyUntil, MERCHANT_ROLE } = fixture;

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);
      await contract.connect(merchant).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil);

      const listingMetadata = hre.ethers.id("listing-metadata");
      const price = hre.ethers.parseEther("5");
      await contract.connect(buyer).createListing(1, price, listingMetadata);

      return {
        ...fixture,
        listingMetadata,
        price,
      };
    }

    it("requestPurchase succeeds with exact MON value", async function () {
      const { contract, buyer2, price } = await loadFixture(listedPassportFixture);

      await expect(contract.connect(buyer2).requestPurchase(1, { value: price }))
        .to.emit(contract, "PurchaseRequested")
        .withArgs(1, buyer2.address, price);

      const listing = await contract.getListing(1);
      expect(listing.buyer).to.equal(buyer2.address);
      expect(listing.status).to.equal(1); // Requested
    });

    it("requestPurchase fails with incorrect MON value", async function () {
      const { contract, buyer2, price } = await loadFixture(listedPassportFixture);

      await expect(
        contract.connect(buyer2).requestPurchase(1, { value: price - 1n })
      ).to.be.revertedWithCustomError(contract, "IncorrectMONValue");
    });

    it("seller cannot purchase own listing", async function () {
      const { contract, buyer, price } = await loadFixture(listedPassportFixture);

      await expect(
        contract.connect(buyer).requestPurchase(1, { value: price })
      ).to.be.revertedWithCustomError(contract, "SellerCannotBeBuyer");
    });

    it("duplicate purchase requests locked", async function () {
      const { contract, buyer2, unauthorized, price } = await loadFixture(listedPassportFixture);

      await contract.connect(buyer2).requestPurchase(1, { value: price });

      // Second user tries to buy
      await expect(
        contract.connect(unauthorized).requestPurchase(1, { value: price })
      ).to.be.revertedWithCustomError(contract, "ListingNotActive");
    });

    it("seller accepts purchase request", async function () {
      const { contract, buyer, buyer2, price } = await loadFixture(listedPassportFixture);

      await contract.connect(buyer2).requestPurchase(1, { value: price });

      await expect(contract.connect(buyer).acceptPurchaseRequest(1))
        .to.emit(contract, "PurchaseAccepted")
        .withArgs(1);

      const listing = await contract.getListing(1);
      expect(listing.status).to.equal(2); // Accepted
    });

    it("non-seller cannot accept or reject request", async function () {
      const { contract, buyer2, unauthorized, price } = await loadFixture(listedPassportFixture);

      await contract.connect(buyer2).requestPurchase(1, { value: price });

      await expect(
        contract.connect(unauthorized).acceptPurchaseRequest(1)
      ).to.be.revertedWithCustomError(contract, "NotListingSeller");

      await expect(
        contract.connect(unauthorized).rejectPurchaseRequest(1)
      ).to.be.revertedWithCustomError(contract, "NotListingSeller");
    });

    it("seller rejects and buyer receives refund", async function () {
      const { contract, buyer, buyer2, price } = await loadFixture(listedPassportFixture);

      await contract.connect(buyer2).requestPurchase(1, { value: price });

      const prevBalance = await hre.ethers.provider.getBalance(buyer2.address);

      const tx = await contract.connect(buyer).rejectPurchaseRequest(1);
      await tx.wait();

      const newBalance = await hre.ethers.provider.getBalance(buyer2.address);
      expect(newBalance).to.equal(prevBalance + price);

      const listing = await contract.getListing(1);
      expect(listing.status).to.equal(0); // Active again
      expect(listing.buyer).to.equal(hre.ethers.ZeroAddress);
    });

    it("buyer cancels before acceptance and receives refund", async function () {
      const { contract, buyer2, price } = await loadFixture(listedPassportFixture);

      await contract.connect(buyer2).requestPurchase(1, { value: price });

      const prevBalance = await hre.ethers.provider.getBalance(buyer2.address);

      const tx = await contract.connect(buyer2).cancelPurchaseRequest(1);
      const receipt = await tx.wait();
      const gasSpent = receipt!.gasUsed * receipt!.gasPrice;

      const newBalance = await hre.ethers.provider.getBalance(buyer2.address);
      expect(newBalance).to.equal(prevBalance + price - gasSpent);

      const listing = await contract.getListing(1);
      expect(listing.status).to.equal(0); // Active again
      expect(listing.buyer).to.equal(hre.ethers.ZeroAddress);
    });

    it("buyer cannot cancel after acceptance", async function () {
      const { contract, buyer, buyer2, price } = await loadFixture(listedPassportFixture);

      await contract.connect(buyer2).requestPurchase(1, { value: price });
      await contract.connect(buyer).acceptPurchaseRequest(1);

      await expect(
        contract.connect(buyer2).cancelPurchaseRequest(1)
      ).to.be.revertedWithCustomError(contract, "ListingNotRequested");
    });
  });

  describe("Escrow Settlement & Completion", function () {
    async function acceptedRequestFixture() {
      const fixture = await loadFixture(deployFixture);
      const { contract, deployer, merchant, buyer, buyer2, sampleHash, sampleProductId, purchasedAt, warrantyUntil, MERCHANT_ROLE } = fixture;

      await contract.connect(deployer).grantRole(MERCHANT_ROLE, merchant.address);
      await contract.connect(merchant).issuePassport(buyer.address, sampleProductId, sampleHash, purchasedAt, warrantyUntil);

      const listingMetadata = hre.ethers.id("listing-metadata");
      const price = hre.ethers.parseEther("5");
      await contract.connect(buyer).createListing(1, price, listingMetadata);
      await contract.connect(buyer2).requestPurchase(1, { value: price });
      await contract.connect(buyer).acceptPurchaseRequest(1);

      return {
        ...fixture,
        listingMetadata,
        price,
      };
    }

    it("only accepted buyer can confirm receipt, releasing escrow and transferring ownership", async function () {
      const { contract, buyer, buyer2, price } = await loadFixture(acceptedRequestFixture);

      const sellerPrevBalance = await hre.ethers.provider.getBalance(buyer.address);

      await expect(contract.connect(buyer2).confirmReceived(1))
        .to.emit(contract, "SaleCompleted")
        .and.to.emit(contract, "PassportTransferred").withArgs(1, buyer.address, buyer2.address);

      const sellerNewBalance = await hre.ethers.provider.getBalance(buyer.address);
      expect(sellerNewBalance).to.equal(sellerPrevBalance + price);

      const listing = await contract.getListing(1);
      expect(listing.status).to.equal(3); // Completed
      expect(listing.saleProofHash).to.not.equal(hre.ethers.ZeroHash);

      const passport = await contract.getPassport(1);
      expect(passport.currentOwner).to.equal(buyer2.address);
    });

    it("non-buyer confirmation fails", async function () {
      const { contract, buyer, unauthorized } = await loadFixture(acceptedRequestFixture);

      await expect(
        contract.connect(unauthorized).confirmReceived(1)
      ).to.be.revertedWithCustomError(contract, "NotListingBuyer");

      await expect(
        contract.connect(buyer).confirmReceived(1)
      ).to.be.revertedWithCustomError(contract, "NotListingBuyer");
    });

    it("completed listing cannot be completed again", async function () {
      const { contract, buyer2 } = await loadFixture(acceptedRequestFixture);

      await contract.connect(buyer2).confirmReceived(1);

      await expect(
        contract.connect(buyer2).confirmReceived(1)
      ).to.be.revertedWithCustomError(contract, "ListingNotAccepted");
    });

    it("stuck escrow resolution works", async function () {
      const { contract, deployer, buyer, buyer2, price } = await loadFixture(acceptedRequestFixture);

      const buyerPrevBalance = await hre.ethers.provider.getBalance(buyer2.address);

      // Admin resolves and refunds buyer
      await expect(contract.connect(deployer).resolveStuckEscrow(1, true))
        .to.emit(contract, "EscrowRefunded").withArgs(1, buyer2.address, price);

      const buyerNewBalance = await hre.ethers.provider.getBalance(buyer2.address);
      expect(buyerNewBalance).to.equal(buyerPrevBalance + price);

      const listing = await contract.getListing(1);
      expect(listing.buyer).to.equal(hre.ethers.ZeroAddress);
      expect(listing.status).to.equal(0); // Back to Active
    });
  });
});
