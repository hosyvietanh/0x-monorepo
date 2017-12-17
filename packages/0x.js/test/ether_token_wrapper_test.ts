import {BlockchainLifecycle} from '@0xproject/dev-utils';
import BigNumber from 'bignumber.js';
import * as chai from 'chai';
import 'mocha';
import * as Web3 from 'web3';

import {ZeroEx, ZeroExError} from '../src';
import {artifacts} from '../src/artifacts';

import {chaiSetup} from './utils/chai_setup';
import {constants} from './utils/constants';
import {web3Factory} from './utils/web3_factory';

chaiSetup.configure();
const expect = chai.expect;
const blockchainLifecycle = new BlockchainLifecycle(constants.RPC_URL);

// Since the address depositing/withdrawing ETH/WETH also needs to pay gas costs for the transaction,
// a small amount of ETH will be used to pay this gas cost. We therefore check that the difference between
// the expected balance and actual balance (given the amount of ETH deposited), only deviates by the amount
// required to pay gas costs.
const MAX_REASONABLE_GAS_COST_IN_WEI = 62517;

describe('EtherTokenWrapper', () => {
    let web3: Web3;
    let zeroEx: ZeroEx;
    let userAddresses: string[];
    let addressWithETH: string;
    let wethContractAddress: string;
    let depositWeiAmount: BigNumber;
    let decimalPlaces: number;
    const gasPrice = new BigNumber(1);
    const zeroExConfig = {
        gasPrice,
        networkId: constants.TESTRPC_NETWORK_ID,
    };
    before(async () => {
        web3 = web3Factory.create();
        zeroEx = new ZeroEx(web3.currentProvider, zeroExConfig);
        userAddresses = await zeroEx.getAvailableAddressesAsync();
        addressWithETH = userAddresses[0];
        wethContractAddress = (zeroEx.etherToken as any)._getContractAddress(artifacts.EtherTokenArtifact);
        depositWeiAmount = (zeroEx as any)._web3Wrapper.toWei(new BigNumber(5));
        decimalPlaces = 7;
    });
    beforeEach(async () => {
        await blockchainLifecycle.startAsync();
    });
    afterEach(async () => {
        await blockchainLifecycle.revertAsync();
    });
    describe('#depositAsync', () => {
        it('should successfully deposit ETH and issue Wrapped ETH tokens', async () => {
            const preETHBalance = await (zeroEx as any)._web3Wrapper.getBalanceInWeiAsync(addressWithETH);
            const preWETHBalance = await zeroEx.token.getBalanceAsync(wethContractAddress, addressWithETH);
            expect(preETHBalance).to.be.bignumber.gt(0);
            expect(preWETHBalance).to.be.bignumber.equal(0);

            const txHash = await zeroEx.etherToken.depositAsync(wethContractAddress, depositWeiAmount, addressWithETH);
            await zeroEx.awaitTransactionMinedAsync(txHash);

            const postETHBalanceInWei = await (zeroEx as any)._web3Wrapper.getBalanceInWeiAsync(addressWithETH);
            const postWETHBalanceInBaseUnits = await zeroEx.token.getBalanceAsync(wethContractAddress, addressWithETH);

            expect(postWETHBalanceInBaseUnits).to.be.bignumber.equal(depositWeiAmount);
            const remainingETHInWei = preETHBalance.minus(depositWeiAmount);
            const gasCost = remainingETHInWei.minus(postETHBalanceInWei);
            expect(gasCost).to.be.bignumber.lte(MAX_REASONABLE_GAS_COST_IN_WEI);
        });
        it('should throw if user has insufficient ETH balance for deposit', async () => {
            const preETHBalance = await (zeroEx as any)._web3Wrapper.getBalanceInWeiAsync(addressWithETH);

            const extraETHBalance = (zeroEx as any)._web3Wrapper.toWei(5, 'ether');
            const overETHBalanceinWei = preETHBalance.add(extraETHBalance);

            return expect(
                zeroEx.etherToken.depositAsync(wethContractAddress, overETHBalanceinWei, addressWithETH),
            ).to.be.rejectedWith(ZeroExError.InsufficientEthBalanceForDeposit);
        });
    });
    describe('#withdrawAsync', () => {
        it('should successfully withdraw ETH in return for Wrapped ETH tokens', async () => {
            const ETHBalanceInWei = await (zeroEx as any)._web3Wrapper.getBalanceInWeiAsync(addressWithETH);

            await zeroEx.etherToken.depositAsync(wethContractAddress, depositWeiAmount, addressWithETH);

            const expectedPreETHBalance = ETHBalanceInWei.minus(depositWeiAmount);
            const preETHBalance = await (zeroEx as any)._web3Wrapper.getBalanceInWeiAsync(addressWithETH);
            const preWETHBalance = await zeroEx.token.getBalanceAsync(wethContractAddress, addressWithETH);
            let gasCost = expectedPreETHBalance.minus(preETHBalance);
            expect(gasCost).to.be.bignumber.lte(MAX_REASONABLE_GAS_COST_IN_WEI);
            expect(preWETHBalance).to.be.bignumber.equal(depositWeiAmount);

            const txHash = await zeroEx.etherToken.withdrawAsync(wethContractAddress, depositWeiAmount, addressWithETH);
            await zeroEx.awaitTransactionMinedAsync(txHash);

            const postETHBalance = await (zeroEx as any)._web3Wrapper.getBalanceInWeiAsync(addressWithETH);
            const postWETHBalanceInBaseUnits = await zeroEx.token.getBalanceAsync(wethContractAddress, addressWithETH);

            expect(postWETHBalanceInBaseUnits).to.be.bignumber.equal(0);
            const expectedETHBalance = preETHBalance.add(depositWeiAmount).round(decimalPlaces);
            gasCost = expectedETHBalance.minus(postETHBalance);
            expect(gasCost).to.be.bignumber.lte(MAX_REASONABLE_GAS_COST_IN_WEI);
        });
        it('should throw if user has insufficient WETH balance for withdrawl', async () => {
            const preWETHBalance = await zeroEx.token.getBalanceAsync(wethContractAddress, addressWithETH);
            expect(preWETHBalance).to.be.bignumber.equal(0);

            const overWETHBalance = preWETHBalance.add(999999999);

            return expect(
                zeroEx.etherToken.withdrawAsync(wethContractAddress, overWETHBalance, addressWithETH),
            ).to.be.rejectedWith(ZeroExError.InsufficientWEthBalanceForWithdrawal);
        });
    });
});
