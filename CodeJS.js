/*
 * Оформлення Js коду
 * Цей код описує процеси оплати перевірки, відображення bitcoin
 * Як на мене досить цікава реалізація то ж тому вирішив також його прикріпити.
 * Робота із контрактами (спеціальні json файли для створення транзакцій)
 */

import { Web3StakingContracts } from './Web3StakingContracts.js';
import { Web3ClaimContracts } from './Web3ClaimContracts';
import { STAKING_TYPES } from './constants';

export class StakingContracts extends Web3StakingContracts {
  chainId = async () => await this.getChainId();
  balance = async () => await this.balanceStaking();
  isPermissionPay = async () => await this.isBalanceSmartChain();
  allowance = {
    fixed: async () => await this.allowanceStaking(STAKING_TYPES.FIXED),
    flexible: async () => await this.allowanceStaking(STAKING_TYPES.FLEXIBLE),
    lp: async () => await this.allowanceStaking(STAKING_TYPES.LP)
  };
  approve = {
    fixed: async amount => await this.approveStaking({ typeAddress: STAKING_TYPES.FIXED, amount }),
    flexible: async amount => await this.approveStaking({ typeAddress: STAKING_TYPES.FLEXIBLE, amount }),
    lp: async amount => await this.approveStaking({ typeAddress: STAKING_TYPES.LP, amount })
  };
  stake = {
    fixed: async (slot, amount) => await this.fixedStake({ slot, amount }),
    flexible: async amount => await this.flexibleStake({ amount }),
    lp: async amount => await this.lpStake({ amount })
  };
  pay = {
    fixed: async (id, amount) => await this.fixedPay({ id, amount }),
    flexible: async amount => await this.flexiblePay({ amount }),
    lp: async amount => await this.flexibleLP({ amount })
  };

  async fixedPay(payload) {
    const { id, amount } = payload;
    let result = {};
    const valid = await this.isPermissionPay();
    if (!valid) {
      return false;
    }
    const convertAmount = this.toWei(amount);
    result = await this.myStakes();
    if (result.success === false) {
      return false;
    }
    const allowance = await this.allowance.fixed();
    if (allowance.success === false) {
      return false;
    }
    if (allowance < convertAmount) {
      result = await this.approve.fixed(convertAmount);
      if (result.success === false) {
        return result;
      }
      result = await this.stake.fixed(id, convertAmount);
      if (result.success === false) {
        return result;
      }
      return result;
    } else {
      result = await this.stake.fixed(id, convertAmount);
      if (result.success === false) {
        return result;
      }
      return result;
    }
  }
  async flexiblePay(payload) {
    const { amount } = payload;
    const valid = await this.isPermissionPay();
    if (!valid) {
      return false;
    }
    const convertAmount = this.toWei(amount);

    const allowance = await this.allowance.flexible();
    if (allowance.success === false) {
      return false;
    }
    let result = {};
    if (allowance < convertAmount) {
      result = await this.approve.flexible(convertAmount);
      if (result.success === false) {
        return result;
      }
      result = await this.stake.flexible(convertAmount);
      if (result.success === false) {
        return result;
      }
      return result;
    } else {
      result = await this.stake.flexible(convertAmount);
      if (result.success === false) {
        return result;
      }
      return result;
    }
  }
  async flexibleLP(payload) {
    const { amount } = payload;
    const valid = await this.isPermissionPay();
    if (!valid) {
      return false;
    }
    const convertAmount = this.toWei(amount);
    const allowance = await this.allowance.lp();
    if (allowance.success === false) {
      return false;
    }
    let result = {};
    if (allowance < convertAmount) {
      result = await this.approve.lp(convertAmount);
      if (result.success === false) {
        return result;
      }
      result = await this.stake.lp(convertAmount);
      if (result.success === false) {
        return result;
      }
      return result;
    } else {
      result = await this.stake.lp(convertAmount);
      if (result.success === false) {
        return result;
      }
      return result;
    }
  }
  async getMetaMaskBalance() {
    const { selectedAddress } = await window.ethereum;
    if (!selectedAddress) {
      return false;
    }

    const valid = await this.isPermissionPay();
    if (!valid) {
      return false;
    }
    const balance = await this.balance();
    if (parseInt(balance) === 0) {
      return {
        success: false,
        message: 'You do not have enough resources to perform the operation'
      };
    }
    const convertBalance = this.fromWei(balance, 'ether');
    return parseInt(convertBalance);
  }
}

export class ClaimContracts extends Web3ClaimContracts {
  myBalance = async () => await this._getBaseBalance();
  claim = async numeric => await this._claim({ numeric });
  claimAll = async () => await this._claimAll();
  toWei = numeric => this._getToWei(numeric);
  fromWei = numeric => this._getFromWei(numeric);
}
