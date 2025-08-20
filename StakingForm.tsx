"use client";

import React from 'react';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import { formatEther, parseEther } from 'viem';

type StakingFormProps = {
  actionType: 'stake' | 'undelegate'; 
  
  balance: bigint;
  amount: string;
  setAmount: (value: string) => void;
  percentage: number;
  setPercentage: (value: number) => void;
  onAction: () => void;
  isProcessing: boolean;
};

const StakingForm: React.FC<StakingFormProps> = ({
  actionType,
  balance,
  amount,
  setAmount,
  percentage,
  setPercentage,
  onAction,
  isProcessing
}) => {
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(sanitized);
    const numAmount = parseFloat(sanitized);
    if (!isNaN(numAmount) && balance > 0n) {
      setPercentage(Math.min(100, (numAmount / parseFloat(formatEther(balance))) * 100));
    } else {
      setPercentage(0);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPercentage = parseInt(e.target.value, 10);
    setPercentage(newPercentage);
    if (balance > 0n) {
      const newAmount = (parseFloat(formatEther(balance)) * newPercentage) / 100;
      setAmount(newAmount.toFixed(18).replace(/\.?0+$/, ''));
    }
  };

  const handleMax = () => {
    setAmount(formatEther(balance));
    setPercentage(100);
  };

  const isStake = actionType === 'stake';

  return (
    <div className="space-y-4 bg-slate-100 dark:bg-slate-800/50 p-5 rounded-2xl">
      <label htmlFor="amount" className="text-sm font-semibold text-foreground">
        Amount to {isStake ? 'Stake' : 'Undelegate'}
      </label>
      <div className="relative">
        <BanknotesIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
        <input
          type="text"
          id="amount"
          value={amount}
          onChange={handleAmountChange}
          placeholder="0.0"
          className="w-full bg-card border border-border rounded-lg p-3 pl-10 text-foreground focus:ring-2 focus:ring-primary-500 transition-all"
          disabled={isProcessing}
        />
        <button
          onClick={handleMax}
          className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-md font-semibold disabled:opacity-50
            ${isStake 
              ? 'bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 hover:bg-primary-500/20' 
              : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20'
            }`}
          type="button"
          disabled={isProcessing || balance === 0n}
        >Max</button>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={percentage}
        onChange={handleSliderChange}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none bg-slate-200 dark:bg-slate-700
          ${isStake ? 'accent-primary-500' : 'accent-red-500'}
        `}
        disabled={isProcessing || balance === 0n}
      />
      <button
        onClick={onAction}
        disabled={isProcessing || !amount || parseFloat(amount) <= 0 || parseEther(amount) > balance}
        className={`w-full py-3 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-70 ${
          isStake 
            ? 'bg-gradient-to-r from-primary-600 to-blue-600 disabled:from-slate-500'
            : 'bg-gradient-to-r from-red-600 to-rose-700 disabled:from-slate-500'
        }`}
      >
        {isProcessing ? 'Processing...' : `Confirm ${isStake ? 'Stake' : 'Undelegate'}`}
      </button>
    </div>
  );
};

export default StakingForm;