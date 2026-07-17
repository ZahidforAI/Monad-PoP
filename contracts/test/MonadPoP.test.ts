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

    // Use ethers v6 helper to calculate keccak256 hash of a string
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
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be
        .true;
    });

    it("deployer does not have MERCHANT_ROLE initially", async function () {
      const { contract, deployer, MERCHANT_ROLE } =
        await loadFixture(deployFixture);
      expect(await contract.hasRole(MERCHANT_ROLE, deployer.address)).to.be
        .false;
    });

    it("admin can grant MERCHANT_ROLE", async function () {
      const { contract, deployer, merchant, MERCHANT_ROLE } =
        await loadFixture(deployFixture);
      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);
      expect(await contract.hasRole(MERCHANT_ROLE, merchant.address)).to.be
        .true;
    });

    it("admin can revoke MERCHANT_ROLE", async function () {
      const { contract, deployer, merchant, MERCHANT_ROLE } =
        await loadFixture(deployFixture);
      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);
      await contract
        .connect(deployer)
        .revokeRole(MERCHANT_ROLE, merchant.address);
      expect(await contract.hasRole(MERCHANT_ROLE, merchant.address)).to.be
        .false;
    });
  });

  describe("Issuing Receipts", function () {
    it("unauthorized address cannot issue a receipt", async function () {
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
        contract
          .connect(unauthorized)
          .issueReceipt(
            buyer.address,
            sampleProductId,
            sampleHash,
            purchasedAt,
            warrantyUntil
          )
      ).to.be.reverted;
    });

    it("authorized merchant can issue a receipt", async function () {
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

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);

      const tx = await contract
        .connect(merchant)
        .issueReceipt(
          buyer.address,
          sampleProductId,
          sampleHash,
          purchasedAt,
          warrantyUntil
        );

      const receipt = await tx.wait();
      expect(receipt!.status).to.equal(1);

      const stored = await contract.getReceipt(1);
      expect(stored.id).to.equal(1);
      expect(stored.buyer).to.equal(buyer.address);
      expect(stored.merchant).to.equal(merchant.address);
    });

    it("emitted event contains correct indexed fields", async function () {
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

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);

      await expect(
        contract
          .connect(merchant)
          .issueReceipt(
            buyer.address,
            sampleProductId,
            sampleHash,
            purchasedAt,
            warrantyUntil
          )
      )
        .to.emit(contract, "ReceiptIssued")
        .withArgs(1, merchant.address, buyer.address, sampleProductId, sampleHash);
    });

    it("stored receipt contains expected hash and addresses", async function () {
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

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);
      await contract
        .connect(merchant)
        .issueReceipt(
          buyer.address,
          sampleProductId,
          sampleHash,
          purchasedAt,
          warrantyUntil
        );

      const stored = await contract.getReceipt(1);
      expect(stored.receiptHash).to.equal(sampleHash);
      expect(stored.productId).to.equal(sampleProductId);
      expect(stored.merchant).to.equal(merchant.address);
      expect(stored.buyer).to.equal(buyer.address);
      expect(stored.purchasedAt).to.equal(purchasedAt);
      expect(stored.warrantyUntil).to.equal(warrantyUntil);
      expect(stored.status).to.equal(0); // Active
    });

    it("duplicate hashes are rejected", async function () {
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

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);
      await contract
        .connect(merchant)
        .issueReceipt(
          buyer.address,
          sampleProductId,
          sampleHash,
          purchasedAt,
          warrantyUntil
        );

      await expect(
        contract
          .connect(merchant)
          .issueReceipt(
            buyer2.address,
            sampleProductId,
            sampleHash,
            purchasedAt,
            warrantyUntil
          )
      ).to.be.revertedWithCustomError(contract, "DuplicateReceiptHash");
    });

    it("zero buyer is rejected", async function () {
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

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);

      await expect(
        contract
          .connect(merchant)
          .issueReceipt(
            "0x0000000000000000000000000000000000000000",
            sampleProductId,
            sampleHash,
            purchasedAt,
            warrantyUntil
          )
      ).to.be.revertedWithCustomError(contract, "ZeroBuyerAddress");
    });

    it("zero hash is rejected", async function () {
      const {
        contract,
        deployer,
        merchant,
        buyer,
        sampleProductId,
        purchasedAt,
        warrantyUntil,
        MERCHANT_ROLE,
      } = await loadFixture(deployFixture);

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);

      const zeroHash =
        "0x0000000000000000000000000000000000000000000000000000000000000000";

      await expect(
        contract
          .connect(merchant)
          .issueReceipt(
            buyer.address,
            sampleProductId,
            zeroHash,
            purchasedAt,
            warrantyUntil
          )
      ).to.be.revertedWithCustomError(contract, "ZeroReceiptHash");
    });

    it("zero productId is rejected", async function () {
      const {
        contract,
        deployer,
        merchant,
        buyer,
        sampleHash,
        purchasedAt,
        warrantyUntil,
        MERCHANT_ROLE,
      } = await loadFixture(deployFixture);

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);

      const zeroProductId =
        "0x0000000000000000000000000000000000000000000000000000000000000000";

      await expect(
        contract
          .connect(merchant)
          .issueReceipt(
            buyer.address,
            zeroProductId,
            sampleHash,
            purchasedAt,
            warrantyUntil
          )
      ).to.be.revertedWithCustomError(contract, "ZeroProductId");
    });

    it("warranty before purchase date is rejected", async function () {
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

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);

      const badWarranty = purchasedAt - BigInt(1000);

      await expect(
        contract
          .connect(merchant)
          .issueReceipt(
            buyer.address,
            sampleProductId,
            sampleHash,
            purchasedAt,
            badWarranty
          )
      ).to.be.revertedWithCustomError(contract, "WarrantyBeforePurchase");
    });

    it("revoked merchant cannot issue additional receipts", async function () {
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

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);
      await contract
        .connect(deployer)
        .revokeRole(MERCHANT_ROLE, merchant.address);

      await expect(
        contract
          .connect(merchant)
          .issueReceipt(
            buyer.address,
            sampleProductId,
            sampleHash,
            purchasedAt,
            warrantyUntil
          )
      ).to.be.reverted;
    });
  });

  describe("Status Updates", function () {
    async function issuedReceiptFixture() {
      const fixture = await loadFixture(deployFixture);
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
      } = fixture;

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);
      await contract
        .connect(merchant)
        .issueReceipt(
          buyer.address,
          sampleProductId,
          sampleHash,
          purchasedAt,
          warrantyUntil
        );

      return fixture;
    }

    it("another merchant cannot change a receipt's status", async function () {
      const { contract, deployer, merchant2, MERCHANT_ROLE } =
        await loadFixture(issuedReceiptFixture);

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant2.address);

      await expect(
        contract.connect(merchant2).updateReceiptStatus(1, 1) // Returned
      ).to.be.revertedWithCustomError(contract, "NotIssuingMerchant");
    });

    it("buyer cannot change a receipt's status", async function () {
      const { contract, buyer } = await loadFixture(issuedReceiptFixture);

      await expect(
        contract.connect(buyer).updateReceiptStatus(1, 1)
      ).to.be.revertedWithCustomError(contract, "NotIssuingMerchant");
    });

    it("issuing merchant can mark a receipt returned", async function () {
      const { contract, merchant } = await loadFixture(issuedReceiptFixture);

      await expect(contract.connect(merchant).updateReceiptStatus(1, 1))
        .to.emit(contract, "ReceiptStatusChanged")
        .withArgs(1, 0, 1); // Active -> Returned

      const stored = await contract.getReceipt(1);
      expect(stored.status).to.equal(1);
    });

    it("issuing merchant can mark a receipt refunded", async function () {
      const { contract, merchant } = await loadFixture(issuedReceiptFixture);

      await expect(contract.connect(merchant).updateReceiptStatus(1, 2))
        .to.emit(contract, "ReceiptStatusChanged")
        .withArgs(1, 0, 2); // Active -> Refunded
    });

    it("issuing merchant can mark a receipt revoked", async function () {
      const { contract, merchant } = await loadFixture(issuedReceiptFixture);

      await expect(contract.connect(merchant).updateReceiptStatus(1, 4))
        .to.emit(contract, "ReceiptStatusChanged")
        .withArgs(1, 0, 4); // Active -> Revoked
    });

    it("cannot transition to same status", async function () {
      const { contract, merchant } = await loadFixture(issuedReceiptFixture);

      await expect(
        contract.connect(merchant).updateReceiptStatus(1, 0) // Active -> Active
      ).to.be.revertedWithCustomError(contract, "InvalidStatusTransition");
    });

    it("finalized status cannot return to Active", async function () {
      const { contract, merchant } = await loadFixture(issuedReceiptFixture);

      await contract.connect(merchant).updateReceiptStatus(1, 1); // Return

      await expect(
        contract.connect(merchant).updateReceiptStatus(1, 0) // Returned -> Active
      ).to.be.revertedWithCustomError(contract, "ReceiptAlreadyFinalized");
    });

    it("finalized receipt cannot transition further", async function () {
      const { contract, merchant } = await loadFixture(issuedReceiptFixture);

      await contract.connect(merchant).updateReceiptStatus(1, 1); // Return

      await expect(
        contract.connect(merchant).updateReceiptStatus(1, 2) // Returned -> Refunded
      ).to.be.revertedWithCustomError(contract, "ReceiptAlreadyFinalized");
    });
  });

  describe("Receipt Replacement", function () {
    async function issuedReceiptFixture() {
      const fixture = await loadFixture(deployFixture);
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
      } = fixture;

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);
      await contract
        .connect(merchant)
        .issueReceipt(
          buyer.address,
          sampleProductId,
          sampleHash,
          purchasedAt,
          warrantyUntil
        );

      return fixture;
    }

    it("replacement creates new receipt and marks original replaced", async function () {
      const { contract, merchant, warrantyUntil } =
        await loadFixture(issuedReceiptFixture);

      const newHash = hre.ethers.id("replacement-receipt");

      const tx = await contract
        .connect(merchant)
        .replaceReceipt(1, newHash, warrantyUntil);

      await expect(tx)
        .to.emit(contract, "ReceiptReplaced")
        .withArgs(1, 2);

      const oldReceipt = await contract.getReceipt(1);
      expect(oldReceipt.status).to.equal(3); // Replaced

      const newReceipt = await contract.getReceipt(2);
      expect(newReceipt.status).to.equal(0); // Active
      expect(newReceipt.receiptHash).to.equal(newHash);
      expect(newReceipt.buyer).to.equal(oldReceipt.buyer);
    });

    it("cannot replace already finalized receipt", async function () {
      const { contract, merchant } = await loadFixture(issuedReceiptFixture);

      // Return the receipt first
      await contract.connect(merchant).updateReceiptStatus(1, 1);

      const newHash = hre.ethers.id("replacement-receipt-2");

      await expect(
        contract.connect(merchant).replaceReceipt(1, newHash, 0)
      ).to.be.revertedWithCustomError(contract, "ReceiptAlreadyFinalized");
    });
  });

  describe("Hash Verification", function () {
    async function issuedReceiptFixture() {
      const fixture = await loadFixture(deployFixture);
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
      } = fixture;

      await contract
        .connect(deployer)
        .grantRole(MERCHANT_ROLE, merchant.address);
      await contract
        .connect(merchant)
        .issueReceipt(
          buyer.address,
          sampleProductId,
          sampleHash,
          purchasedAt,
          warrantyUntil
        );

      return fixture;
    }

    it("verifyReceiptHash returns true for original payload", async function () {
      const { contract, sampleHash } =
        await loadFixture(issuedReceiptFixture);

      expect(await contract.verifyReceiptHash(1, sampleHash)).to.be.true;
    });

    it("verifyReceiptHash returns false for modified data", async function () {
      const { contract } = await loadFixture(issuedReceiptFixture);

      const wrongHash = hre.ethers.id("modified-data");
      expect(await contract.verifyReceiptHash(1, wrongHash)).to.be.false;
    });

    it("receiptExists returns true for existing receipt", async function () {
      const { contract } = await loadFixture(issuedReceiptFixture);
      expect(await contract.receiptExists(1)).to.be.true;
    });

    it("receiptExists returns false for non-existent receipt", async function () {
      const { contract } = await loadFixture(issuedReceiptFixture);
      expect(await contract.receiptExists(999)).to.be.false;
    });

    it("getReceipt reverts for non-existent receipt", async function () {
      const { contract } = await loadFixture(issuedReceiptFixture);
      await expect(contract.getReceipt(999)).to.be.revertedWithCustomError(
        contract,
        "ReceiptNotFound"
      );
    });
  });
});
