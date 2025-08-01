const hre = require('hardhat');
const { getChainId, network } = hre;

const wethByNetwork = {
    hardhat: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    'base-sepolia': '0x4200000000000000000000000000000000000006',
};

module.exports = async ({ getNamedAccounts, deployments }) => {
    console.log('running deploy script');
    console.log('network id ', await getChainId());

    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const limitOrderProtocol = await deploy('LimitOrderProtocol', {
        from: deployer,
        args: [wethByNetwork[network.name]],
    });

    console.log('LimitOrderProtocol deployed to:', limitOrderProtocol.address);

    if (await getChainId() !== '31337') {
        await hre.run('verify:verify', {
            address: limitOrderProtocol.address,
            constructorArguments: [wethByNetwork[network.name]],
        });
    }
};

// Enable deployment for Base Sepolia testnet
module.exports.skip = async (hre) => {
    const chainId = await hre.getChainId();
    // Enable deployment only for Base Sepolia testnet (84532)
    return chainId !== '84532';
};
