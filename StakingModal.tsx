"use client";

import React, { useState, useEffect } from 'react';
import ValidatorAvatar from '@/components/staking/ValidatorAvatar';
import { 
    ArrowDownLeftIcon, 
    ArrowUpRightIcon, 
    XMarkIcon,
} from '@heroicons/react/24/outline';
import EvmStakingLogic from './EvmStakingLogic';
import { type Validator } from './ValidatorTable';
import { type Project } from '@/data/projects';

// Tipe untuk state status
type StatusState = {
    message: string;
    type: 'info' | 'success' | 'error' | '';
    txHash?: string;
};

// --- Komponen Konten Modal yang Diperbarui ---
const StakingModalContent = ({ validator, project, onClose }: { validator: Validator, project: Project, onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'stake' | 'undelegate'>('stake');
    const [status, setStatus] = useState<StatusState>({ message: '', type: '' });

    useEffect(() => {
        // Reset state saat modal dibuka dengan validator baru
        if (validator) {
            setStatus({ message: '', type: '' });
            setActiveTab('stake');
        }
    }, [validator]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                {/* Header Modal */}
                <div className="flex justify-between items-center p-5 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-4 min-w-0">
                        <ValidatorAvatar validator={validator} size="md" />
                        <div className="min-w-0">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Manage Delegation</span>
                            <h2 className="text-lg font-bold text-foreground truncate">{validator?.moniker}</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-muted">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Main content (Tab & Logic) */}
                <div className="p-6 overflow-y-auto">
                    <div className="flex space-x-2 border-b border-border mb-6">
                        <button
                            onClick={() => setActiveTab('stake')}
                            className={`relative flex items-center justify-center gap-2 w-full py-3 font-semibold text-sm transition-colors ${activeTab === 'stake' ? 'text-primary-500' : 'text-slate-400 hover:text-foreground'}`}
                        >
                            <ArrowDownLeftIcon className="w-4 h-4"/>
                            <span>Delegate</span>
                            {activeTab === 'stake' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary-500 rounded-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('undelegate')}
                            className={`relative flex items-center justify-center gap-2 w-full py-3 font-semibold text-sm transition-colors ${activeTab === 'undelegate' ? 'text-primary-500' : 'text-slate-400 hover:text-foreground'}`}
                        >
                            <ArrowUpRightIcon className="w-4 h-4"/>
                            <span>Undelegate</span>
                            {activeTab === 'undelegate' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary-500 rounded-full"></div>}
                        </button>
                    </div>
                    
                    <EvmStakingLogic 
                        validator={validator} 
                        project={project} 
                        activeTab={activeTab}
                        setStatus={setStatus}
                    />
                </div>
                
                {/* --- STATUS MESSAGE --- */}
                {status.message && (
                    <div className="p-4 border-t border-border bg-slate-100 dark:bg-slate-800/50 flex-shrink-0">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-center">
                            <span className={status.type === 'success' ? 'text-green-500' : status.type === 'error' ? 'text-red-500' : 'text-foreground'}>
                                {status.message}
                            </span>
                            {status.txHash && (
                                <a
                                    href={`${project.explorerUrl}/tx/${status.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-primary-500 hover:underline"
                                >
                                    View on Explorer
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const useStakingModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<{ validator: Validator, project: Project } | null>(null);

    const openModal = (validator: Validator, project: Project) => {
        setData({ validator, project });
        setIsOpen(true);
    };
    const closeModal = () => setIsOpen(false);
    
    return {
        Modal: isOpen && data ? () => <StakingModalContent {...data} onClose={closeModal} /> : () => null,
        openModal
    };
};