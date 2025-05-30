import { ethers } from "ethers";

export interface Transaction {
  hash: string;
  type: string;
  amount: string;
  status: string;
  timestamp: Date;
}

export interface WalletInterface {
  address: string;
  balance: number;
  network: string;
  tokenBalance: number;
  nftCount: number;
  transactionCount: number;
  transactions: Transaction[];
}

export interface ContactData {
  id: number;
  walletAddress: string;
  name: string;
  description: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}


export interface ContractTransaction {
  to: string;
  amount: ethers.BigNumber;
  timestamp: ethers.BigNumber;
  description: string;
  executed: boolean;
}

export interface TransactionMapping {
  contractTransaction: ContractTransaction;
  appTransaction: Transaction;
}

export interface SendEtherParams {
  to: string;
  amount: string;
  description: string;
}