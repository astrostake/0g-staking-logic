// src/components/staking/EvmUnbondingInfo.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ClockIcon, CubeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { type Project } from '@/data/projects';

type UnbondingEntry = {
  transactionHash: string;
  amount: number;
  unbondingCompletionBlock: number;
  unbondingCompletionTimestamp: number;
};

// Tambahkan prop refreshTrigger
interface EvmUnbondingInfoProps {
    project: Project;
    refreshTrigger?: number; // Prop baru untuk memicu refetch
}

const EvmUnbondingInfo: React.FC<EvmUnbondingInfoProps> = ({ project, refreshTrigger = 0 }) => {
    const { address } = useAccount();
    const [unbondingEntries, setUnbondingEntries] = useState<UnbondingEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!address || !project.apiUrl) {
            setUnbondingEntries([]);
            setIsLoading(false);
            return;
        }

        const fetchUnbondingData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${project.apiUrl}/delegators/${address}/unbonding_delegations`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setUnbondingEntries(data || []);
            } catch (err) {
                console.error("Failed to fetch EVM unbonding delegations:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUnbondingData();
        
    // Tambahkan refreshTrigger ke dependency array
    }, [address, project.apiUrl, refreshTrigger]);
    
    // Timer untuk me-refresh tampilan waktu (setiap 1 menit)
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 animate-pulse px-4 py-2">
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>Loading unbonding info...</span>
            </div>
        );
    }

    if (unbondingEntries.length === 0) {
        return null; 
    }
    
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unbonding Delegations</h3>
            {unbondingEntries.map((entry, index) => (
                <div key={`${entry.transactionHash}-${index}`} className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-sm">
                    <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                            {entry.amount.toFixed(4)} {project.nativeSymbol}
                        </span>
                        <div className="flex flex-col items-end text-slate-500 dark:text-slate-400 text-xs space-y-1">
                            <div className="flex items-center gap-1.5">
                                <CubeIcon className="w-3 h-3 text-blue-400" />
                                <span>Block {entry.unbondingCompletionBlock}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ClockIcon className="w-3 h-3 text-blue-400" />
                                <span>{new Date(entry.unbondingCompletionTimestamp * 1000).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EvmUnbondingInfo;