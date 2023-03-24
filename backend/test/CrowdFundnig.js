const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CrowdFunding', function () {
  async function deployContract() {
    const [owner, campaignOwner, donator] = await ethers.getSigners();
    const CrowdFunding = await ethers.getContractFactory('CrowdFunding');
    const CUT = 10;
    const crowdFunding = await CrowdFunding.deploy(CUT);
    await crowdFunding.deployed();

    const reciept = await crowdFunding.deployTransaction.wait();
    return { owner, campaignOwner, donator, crowdFunding, reciept, CUT };
  }

  describe('deployment', function () {
    it('Should assign owner as the Owner of the contract', async function () {
      const { owner, crowdFunding } = await loadFixture(deployContract);
      expect(await crowdFunding.owner()).to.equal(owner.address);
    });
  });

  it('Should check that createCampaign is working', async function () {
    const { campaignOwner, crowdFunding } = await loadFixture(deployContract);
    const campaignId = (
      await crowdFunding
        .connect(campaignOwner)
        .createCampaign('test', 'test', 100, 100, 'test')
    ).value.toNumber();
    const campaign = await crowdFunding.campaigns(campaignId);
    expect(campaign.owner).to.equal(campaignOwner.address);
  });

  it('Should check that donateToCampain is working', async function () {
    const { owner, campaignOwner, donator, crowdFunding, CUT } =
      await loadFixture(deployContract);
    const campaignId = (
      await crowdFunding
        .connect(campaignOwner)
        .createCampaign('test', 'test', 100, 100, 'test')
    ).value.toNumber();

    const donationAmount = 1;

    await expect(
      crowdFunding.connect(donator).donateToCampaign(campaignId, {
        value: ethers.utils.parseEther(`${donationAmount}`),
      })
    )
      .to.emit(crowdFunding, 'TransferredToOwner')
      .withArgs(
        owner.address,
        ethers.utils.parseEther(`${(donationAmount * CUT) / 100}`)
      )
      .to.emit(crowdFunding, 'TransferredToCampaignOwner')
      .withArgs(
        campaignOwner.address,
        ethers.utils.parseEther(
          `${donationAmount - (donationAmount * CUT) / 100}`
        )
      );
    expect((await crowdFunding.getDonators(campaignId))[0]).to.deep.equal([
      donator.address,
    ]);
  });

  it('Sould check the cut ', async function () {
    const { owner, campaignOwner, donator, crowdFunding, CUT } =
      await loadFixture(deployContract);
    await expect(
      crowdFunding.connect(campaignOwner).changeCut(50)
    ).to.be.revertedWith("Don't have excess");
    crowdFunding.connect(owner);
    await expect(crowdFunding.connect(owner).changeCut(50)).to.emit(
      crowdFunding,
      'CutChanged'
    );
  });
});
