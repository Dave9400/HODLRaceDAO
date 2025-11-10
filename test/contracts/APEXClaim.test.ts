import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer, parseEther, formatEther, Wallet } from "ethers";

describe("APEXClaim Contract Tests", function () {
  let token: Contract;
  let claimContract: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let signer: Wallet;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;

  const TOTAL_POOL = parseEther("500000000"); // 500M tokens
  const HALVING_INTERVAL = parseEther("100000000"); // 100M tokens

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();

    // Create a separate signer wallet for signing claims
    signer = ethers.Wallet.createRandom();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy();
    await token.waitForDeployment();

    // Mint tokens to owner
    await token.mint(ownerAddress, TOTAL_POOL);

    // Deploy APEXClaim contract
    const APEXClaim = await ethers.getContractFactory("APEXClaim");
    claimContract = await APEXClaim.deploy(
      await token.getAddress(),
      signer.address
    );
    await claimContract.waitForDeployment();

    // Transfer tokens to claim contract
    await token.transfer(await claimContract.getAddress(), TOTAL_POOL);
  });

  // Helper function to generate valid signature
  async function generateSignature(
    userAddress: string,
    iracingId: number,
    wins: number,
    top5s: number,
    starts: number
  ): Promise<string> {
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "uint256", "uint256"],
      [userAddress, iracingId, wins, top5s, starts]
    );

    const signature = await signer.signMessage(ethers.getBytes(messageHash));
    return signature;
  }

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      expect(await claimContract.token()).to.equal(await token.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await claimContract.owner()).to.equal(ownerAddress);
    });

    it("Should set the correct signer", async function () {
      expect(await claimContract.signer()).to.equal(signer.address);
    });

    it("Should have received 500M tokens", async function () {
      const balance = await token.balanceOf(await claimContract.getAddress());
      expect(balance).to.equal(TOTAL_POOL);
    });
  });

  describe("Halving Multipliers", function () {
    it("Should return 100 multiplier for 0-100M claimed", async function () {
      expect(await claimContract.getCurrentMultiplier()).to.equal(100);
    });

    it("Should return 50 multiplier for 100M-200M claimed", async function () {
      // Simulate 100M claimed by calling claim
      const signature = await generateSignature(user1Address, 1, 100000, 0, 0);
      await claimContract.connect(user1).claim(1, 100000, 0, 0, signature);
      
      expect(await claimContract.getCurrentMultiplier()).to.equal(50);
    });

    it("Should return 25 multiplier for 200M-300M claimed", async function () {
      // Simulate 200M claimed
      const sig1 = await generateSignature(user1Address, 1, 100000, 0, 0);
      await claimContract.connect(user1).claim(1, 100000, 0, 0, sig1);
      
      const sig2 = await generateSignature(user2Address, 2, 100000, 0, 0);
      await claimContract.connect(user2).claim(2, 100000, 0, 0, sig2);
      
      expect(await claimContract.getCurrentMultiplier()).to.equal(25);
    });

    it("Should return 12 multiplier for 300M-400M claimed", async function () {
      // Fund more tokens for testing
      await token.mint(ownerAddress, TOTAL_POOL);
      await token.transfer(await claimContract.getAddress(), TOTAL_POOL);

      // Claim 300M total
      for (let i = 0; i < 3; i++) {
        const tempWallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await owner.sendTransaction({ to: tempWallet.address, value: parseEther("1") });
        const sig = await generateSignature(tempWallet.address, i + 1, 100000, 0, 0);
        await claimContract.connect(tempWallet).claim(i + 1, 100000, 0, 0, sig);
      }
      
      expect(await claimContract.getCurrentMultiplier()).to.equal(12);
    });

    it("Should return 6 multiplier for 400M-500M claimed", async function () {
      await token.mint(ownerAddress, TOTAL_POOL * 2n);
      await token.transfer(await claimContract.getAddress(), TOTAL_POOL * 2n);

      for (let i = 0; i < 4; i++) {
        const tempWallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await owner.sendTransaction({ to: tempWallet.address, value: parseEther("1") });
        const sig = await generateSignature(tempWallet.address, i + 1, 100000, 0, 0);
        await claimContract.connect(tempWallet).claim(i + 1, 100000, 0, 0, sig);
      }
      
      expect(await claimContract.getCurrentMultiplier()).to.equal(6);
    });
  });

  describe("Claim Function", function () {
    it("Should allow valid claim with correct signature", async function () {
      const wins = 100;
      const top5s = 250;
      const starts = 500;
      const iracingId = 12345;

      const signature = await generateSignature(
        user1Address,
        iracingId,
        wins,
        top5s,
        starts
      );

      await expect(
        claimContract.connect(user1).claim(iracingId, wins, top5s, starts, signature)
      ).to.not.be.reverted;

      expect(await claimContract.hasClaimed(iracingId)).to.be.true;
    });

    it("Should correctly calculate rewards for Pro Driver", async function () {
      const wins = 100;
      const top5s = 250;
      const starts = 500;
      const iracingId = 12345;

      // Expected: (100*1000 + 250*100 + 500*10) * 1000 * 100 / 100 = 130M tokens
      const expectedReward = parseEther("130000000");

      const signature = await generateSignature(
        user1Address,
        iracingId,
        wins,
        top5s,
        starts
      );

      await claimContract.connect(user1).claim(iracingId, wins, top5s, starts, signature);

      const balance = await token.balanceOf(user1Address);
      expect(balance).to.equal(expectedReward);
    });

    it("Should correctly calculate rewards for Amateur", async function () {
      const wins = 0;
      const top5s = 5;
      const starts = 50;
      const iracingId = 54321;

      // Expected: (0*1000 + 5*100 + 50*10) * 1000 * 100 / 100 = 1M tokens
      const expectedReward = parseEther("1000000");

      const signature = await generateSignature(
        user1Address,
        iracingId,
        wins,
        top5s,
        starts
      );

      await claimContract.connect(user1).claim(iracingId, wins, top5s, starts, signature);

      const balance = await token.balanceOf(user1Address);
      expect(balance).to.equal(expectedReward);
    });

    it("Should prevent double claims with same iRacing ID", async function () {
      const signature = await generateSignature(user1Address, 1, 100, 50, 100);

      await claimContract.connect(user1).claim(1, 100, 50, 100, signature);

      const signature2 = await generateSignature(user1Address, 1, 100, 50, 100);
      
      await expect(
        claimContract.connect(user1).claim(1, 100, 50, 100, signature2)
      ).to.be.revertedWithCustomError(claimContract, "AlreadyClaimed");
    });

    it("Should reject invalid signature", async function () {
      const badSigner = ethers.Wallet.createRandom();
      
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "uint256", "uint256"],
        [user1Address, 1, 100, 50, 100]
      );

      const badSignature = await badSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        claimContract.connect(user1).claim(1, 100, 50, 100, badSignature)
      ).to.be.revertedWithCustomError(claimContract, "InvalidSignature");
    });

    it("Should reject signature with wrong data", async function () {
      const signature = await generateSignature(user1Address, 1, 100, 50, 100);

      // Try to claim with different stats
      await expect(
        claimContract.connect(user1).claim(1, 200, 50, 100, signature)
      ).to.be.revertedWithCustomError(claimContract, "InvalidSignature");
    });
  });

  describe("Pool Cap Enforcement", function () {
    it("Should cap reward at remaining pool", async function () {
      // Claim most of the pool
      const sig1 = await generateSignature(user1Address, 1, 490000, 0, 0);
      await claimContract.connect(user1).claim(1, 490000, 0, 0, sig1);

      const totalClaimed = await claimContract.totalClaimed();
      expect(totalClaimed).to.equal(parseEther("490000000"));

      // Try to claim more than remaining
      const sig2 = await generateSignature(user2Address, 2, 20000, 0, 0);
      await claimContract.connect(user2).claim(2, 20000, 0, 0, sig2);

      // Should only get remaining 10M, not 20M
      const user2Balance = await token.balanceOf(user2Address);
      expect(user2Balance).to.equal(parseEther("10000000"));
    });

    it("Should never exceed 500M total claimed", async function () {
      await token.mint(ownerAddress, TOTAL_POOL);
      await token.transfer(await claimContract.getAddress(), TOTAL_POOL);

      for (let i = 0; i < 5; i++) {
        const tempWallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await owner.sendTransaction({ to: tempWallet.address, value: parseEther("1") });
        const sig = await generateSignature(tempWallet.address, i + 1, 100000, 0, 0);
        await claimContract.connect(tempWallet).claim(i + 1, 100000, 0, 0, sig);
      }

      const totalClaimed = await claimContract.totalClaimed();
      expect(totalClaimed).to.be.lte(TOTAL_POOL);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle claim at exact boundary (99.9M claimed)", async function () {
      const sig1 = await generateSignature(user1Address, 1, 99900, 0, 0);
      await claimContract.connect(user1).claim(1, 99900, 0, 0, sig1);

      expect(await claimContract.getCurrentMultiplier()).to.equal(100);
    });

    it("Should handle claim crossing boundary", async function () {
      // Claim 99M first
      const sig1 = await generateSignature(user1Address, 1, 99000, 0, 0);
      await claimContract.connect(user1).claim(1, 99000, 0, 0, sig1);

      // Claim 10M more (crosses 100M boundary)
      const sig2 = await generateSignature(user2Address, 2, 10000, 0, 0);
      await claimContract.connect(user2).claim(2, 10000, 0, 0, sig2);

      // Should get full 10M at 100% rate (before boundary)
      const user2Balance = await token.balanceOf(user2Address);
      expect(user2Balance).to.equal(parseEther("10000000"));

      // Now multiplier should be 50
      expect(await claimContract.getCurrentMultiplier()).to.equal(50);
    });

    it("Should handle zero stats", async function () {
      const signature = await generateSignature(user1Address, 1, 0, 0, 0);
      
      await expect(
        claimContract.connect(user1).claim(1, 0, 0, 0, signature)
      ).to.be.revertedWithCustomError(claimContract, "InsufficientBalance");
    });

    it("Should handle very large stats within pool", async function () {
      // Add more tokens
      await token.mint(ownerAddress, TOTAL_POOL);
      await token.transfer(await claimContract.getAddress(), TOTAL_POOL);

      const signature = await generateSignature(user1Address, 1, 250000, 0, 0);
      
      await claimContract.connect(user1).claim(1, 250000, 0, 0, signature);

      const balance = await token.balanceOf(user1Address);
      expect(balance).to.equal(parseEther("250000000"));
    });
  });

  describe("getClaimableAmount View Function", function () {
    it("Should match actual claim amount", async function () {
      const wins = 100;
      const top5s = 250;
      const starts = 500;

      const claimable = await claimContract.getClaimableAmount(wins, top5s, starts);

      const signature = await generateSignature(user1Address, 1, wins, top5s, starts);
      await claimContract.connect(user1).claim(1, wins, top5s, starts, signature);

      const balance = await token.balanceOf(user1Address);
      expect(balance).to.equal(claimable);
    });

    it("Should account for current multiplier", async function () {
      // Claim 100M first
      const sig1 = await generateSignature(user1Address, 1, 100000, 0, 0);
      await claimContract.connect(user1).claim(1, 100000, 0, 0, sig1);

      // Check claimable for next user (should be at 50% multiplier)
      const claimable = await claimContract.getClaimableAmount(1000, 1000, 1000);
      
      // Expected: (1000*1000 + 1000*100 + 1000*10) * 1000 * 50 / 100 = 1.5M tokens
      expect(claimable).to.equal(parseEther("1550000"));
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow owner to withdraw", async function () {
      const initialBalance = await token.balanceOf(ownerAddress);
      
      await claimContract.connect(owner).emergencyWithdraw();

      const finalBalance = await token.balanceOf(ownerAddress);
      expect(finalBalance - initialBalance).to.equal(TOTAL_POOL);
    });

    it("Should reject non-owner withdrawal", async function () {
      await expect(
        claimContract.connect(user1).emergencyWithdraw()
      ).to.be.revertedWithCustomError(claimContract, "Unauthorized");
    });
  });
});
