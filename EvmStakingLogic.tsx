// src/components/staking/EvmStakingLogic.tsx

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatEther, parseEther, parseGwei, isAddress } from 'viem';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import EvmUnbondingInfo from './EvmUnbondingInfo';
import StakingForm from './StakingForm';
import { ArrowPathIcon, StarIcon } from '@heroicons/react/24/outline';
import { type Validator } from './ValidatorTable';
import { type Project } from '@/data/projects';

type StatusState = {
    message: string;
    type: 'info' | 'success' | 'error' | '';
    txHash?: string;
};

interface EvmStakingLogicProps {
    validator: Validator;
    project: Project;
    activeTab: 'stake' | 'undelegate';
    setStatus: (status: StatusState) => void;
}

// ABI (Application Binary Interface) for the staking smart contract
const VALIDATOR_ABI = [
    { name: "delegate", type: "function", inputs: [{ name: "delegatorAddress", type: "address" }], outputs: [], stateMutability: "payable" },
    { name: "undelegate", type: "function", inputs: [{ name: "withdrawalAddress", type: "address" }, { name: "shares", type: "uint256" }], outputs: [], stateMutability: "payable" },
    { name: "withdrawCommission", type: "function", inputs: [{ name: "withdrawalAddress", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "nonpayable" },
    { name: "getDelegation", type: "function", inputs: [{ name: "delegator", type: "address" }], outputs: [{ name: "", type: "address" }, { name: "", type: "uint256" }], stateMutability: "view" },
    { name: "tokens", type: "function", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { name: "delegatorShares", type: "function", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { name: "withdrawalFeeInGwei", type: "function", inputs: [], outputs: [{ name: "", type: "uint96" }], stateMutability: "view" }
] as const;

const EvmStakingLogic: React.FC<EvmStakingLogicProps> = ({ 
    validator, 
    project, 
    activeTab, 
    setStatus 
}) => {
    const [stakeAmount, setStakeAmount] = useState<string>('');
    const [undelegateAmount, setUndelegateAmount] = useState<string>('');
    const [stakePercentage, setStakePercentage] = useState<number>(0);
    const [undelegatePercentage, setUndelegatePercentage] = useState<number>(0);

    const { address, isConnected } = useAccount();
    const isValidValidator = useMemo(() => isAddress(validator?.address || '0x'), [validator?.address]);
    const shouldEnableQueries = useMemo(() => !!address && isValidValidator && isConnected, [address, isValidValidator, isConnected]);

    // Check if connected wallet is the validator owner
    const isOwner = useMemo(() => {
        if (!address || !validator?.ownerAddress) return false;
        return address.toLowerCase() === validator.ownerAddress.toLowerCase();
    }, [address, validator?.ownerAddress]);

    const { data: delegationData, refetch: refetchDelegation, isLoading: isDelegationLoading } = useReadContract({ 
        address: validator?.address as `0x${string}`, 
        abi: VALIDATOR_ABI, 
        functionName: 'getDelegation', 
        args: [address as `0x${string}`], 
        query: { enabled: shouldEnableQueries } 
    });

    const { data: totalTokens } = useReadContract({ address: validator?.address as `0x${string}`, abi: VALIDATOR_ABI, functionName: 'tokens', query: { enabled: shouldEnableQueries } });
    const { data: totalShares } = useReadContract({ address: validator?.address as `0x${string}`, abi: VALIDATOR_ABI, functionName: 'delegatorShares', query: { enabled: shouldEnableQueries } });
    const { data: withdrawalFeeData } = useReadContract({ address: validator?.address as `0x${string}`, abi: VALIDATOR_ABI, functionName: 'withdrawalFeeInGwei', query: { enabled: shouldEnableQueries } });
    const { data: userBalanceData, refetch: refetchUserBalance } = useBalance({ address, query: { enabled: shouldEnableQueries } });

    // Important value calculations
    const userShares = useMemo(() => (delegationData as [string, bigint])?.[1] || 0n, [delegationData]);
    const withdrawalFeeInGwei = useMemo(() => withdrawalFeeData ?? 0n, [withdrawalFeeData]);
    const estimatedUserTokens = useMemo(() => (totalShares && totalShares > 0n) ? (BigInt(totalTokens || 0) * userShares) / totalShares : 0n, [totalShares, userShares, totalTokens]);
    const userAvailableBalance = useMemo(() => userBalanceData?.value ?? 0n, [userBalanceData]);

    const { data: hash, isPending, writeContract, error: writeError, reset } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const handleDelegate = useCallback(() => {
        if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
        setStatus({ message: 'Please confirm in your wallet...', type: 'info' });
        writeContract({ address: validator.address as `0x${string}`, abi: VALIDATOR_ABI, functionName: 'delegate', args: [address as `0x${string}`], value: parseEther(stakeAmount) });
    }, [stakeAmount, validator, address, writeContract, setStatus]);

    const handleUndelegate = useCallback(() => {
        if (!undelegateAmount || parseFloat(undelegateAmount) <= 0) return;
        const amountToUndelegateInWei = parseEther(undelegateAmount);
        const sharesToUndelegate = (totalTokens && totalTokens > 0n) ? (amountToUndelegateInWei * (totalShares || 0n)) / totalTokens : 0n;
    
        setStatus({ message: 'Confirming undelegation...', type: 'info' });
        writeContract({ address: validator.address as `0x${string}`, abi: VALIDATOR_ABI, functionName: 'undelegate', args: [address as `0x${string}`, sharesToUndelegate], value: parseGwei(withdrawalFeeInGwei.toString()) });
    }, [undelegateAmount, totalTokens, totalShares, withdrawalFeeInGwei, validator, address, writeContract, setStatus]);

    const handleWithdrawCommission = useCallback(() => {
        setStatus({ message: 'Confirming commission withdrawal...', type: 'info' });
        writeContract({ address: validator.address as `0x${string}`, abi: VALIDATOR_ABI, functionName: 'withdrawCommission', args: [address as `0x${string}`] });
    }, [validator, address, writeContract, setStatus]);

    // Effect to monitor transaction status and provide user feedback
    useEffect(() => {
        if (isConfirming) {
            setStatus({ message: 'Transaction sent, waiting for confirmation...', type: 'info', txHash: hash });
        } else if (isConfirmed) {
            setStatus({ message: 'Transaction successful! Data will refresh shortly.', type: 'success', txHash: hash });
            setTimeout(() => {
                refetchDelegation();
                refetchUserBalance();
            }, 3000);
            setStakeAmount(''); setStakePercentage(0);
            setUndelegateAmount(''); setUndelegatePercentage(0);
        } else if (writeError) {
            const errorMessage = writeError.message.includes('User rejected the request') 
                ? 'Transaction rejected by user.' 
                : 'Transaction failed.';
            setStatus({ message: errorMessage, type: 'error' });
            setTimeout(() => setStatus({ message: '', type: 'info' }), 5000);
            reset();
        }
    }, [isConfirming, isConfirmed, writeError, hash, setStatus, refetchDelegation, refetchUserBalance, reset]);

    const isProcessing = isPending || isConfirming;

    if (isDelegationLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <ArrowPathIcon className="w-8 h-8 text-primary-500 animate-spin" />
                <p className="mt-3 text-slate-500 dark:text-slate-400">Loading your staking data...</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-center">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Your Delegation</h3>
                    <p className="text-xl font-bold text-foreground">
                        {parseFloat(formatEther(estimatedUserTokens)).toFixed(4)}{' '}
                        <span className="text-base font-normal text-slate-500 dark:text-slate-400">{project.nativeSymbol}</span>
                    </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-center">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Available Balance</h3>
                    <p className="text-xl font-bold text-foreground">
                        {parseFloat(formatEther(userAvailableBalance)).toFixed(4)}{' '}
                        <span className="text-base font-normal text-slate-500 dark:text-slate-400">{project.nativeSymbol}</span>
                    </p>
                </div>
            </div>
            
            <EvmUnbondingInfo project={project} />

            {isOwner && (
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl text-center">
                    <div className="flex items-center justify-center mb-2">
                        <StarIcon className="w-4 h-4 text-purple-400 mr-1.5" />
                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Validator Management</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        As the validator operator, you can withdraw your accumulated commission.
                    </p>
                    <button
                        onClick={handleWithdrawCommission}
                        disabled={isProcessing}
                        className="w-full sm:w-auto px-6 py-2 rounded-lg bg-purple-500/80 text-white font-bold text-sm transition-all hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing...' : 'Withdraw Commission'}
                    </button>
                </div>
            )}

            {activeTab === 'stake' ? (
                <StakingForm
                    actionType="stake"
                    balance={userAvailableBalance}
                    amount={stakeAmount}
                    setAmount={setStakeAmount}
                    percentage={stakePercentage}
                    setPercentage={setStakePercentage}
                    onAction={handleDelegate}
                    isProcessing={isProcessing}
                />
            ) : (
                <StakingForm
                    actionType="undelegate"
                    balance={estimatedUserTokens}
                    amount={undelegateAmount}
                    setAmount={setUndelegateAmount}
                    percentage={undelegatePercentage}
                    setPercentage={setUndelegatePercentage}
                    onAction={handleUndelegate}
                    isProcessing={isProcessing}
                />
            )}
        </div>
    );
};

export default EvmStakingLogic;