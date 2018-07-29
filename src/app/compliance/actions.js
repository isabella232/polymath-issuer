// @flow

import React from 'react'
import * as ui from 'polymath-ui'
import { ethereumAddress } from 'polymath-ui/dist/validate'
import { SecurityToken, PercentageTransferManager } from 'polymathjs'
import type { Investor, Address } from 'polymathjs/types'

import { formName as addInvestorFormName } from './components/AddInvestorForm'
import { formName as editInvestorsFormName } from './components/EditInvestorsForm'
import type { GetState } from '../../redux/reducer'

export const PERMANENT_LOCKUP_TS = 67184812800000 // milliseconds

export const TRANSFER_MANAGER = 'compliance/TRANSFER_MANAGER'
export const WHITELIST = 'compliance/WHITELIST'
export const UPLOADED = 'compliance/UPLOADED'

export const PERCENTAGE_TM = 'compliance/PERCENTAGE_TM'
export const percentageTransferManager = (tm: PercentageTransferManager, isPaused: boolean, percentage?: number) =>
  ({ type: PERCENTAGE_TM, tm, isPaused, percentage })

export const LIST_LENGTH = 'compliance/WHITELIST_LENGTH'
export const listLength = (listLength: number) => ({ type: LIST_LENGTH, listLength })

export const RESET_UPLOADED = 'compliance/RESET_UPLOADED'
export const resetUploaded = () => ({ type: RESET_UPLOADED })

export const FREEZE_STATUS = 'compliance/FREEZE_STATUS'
export const FROZEN_MODAL_STATUS='compliance/FROZEN_MODAL_STATUS'
export const showFrozenModal = (show: boolean) => ({ type: FROZEN_MODAL_STATUS, show })

export type InvestorCSVRow = [number, string, string, string, string, string]

export const fetchWhitelist = () => async (dispatch: Function, getState: GetState) => {
  dispatch(ui.fetching())
  try {
    if (!getState().whitelist.transferManager) { // $FlowFixMe
      const st: SecurityToken = getState().token.token.contract
      dispatch({ type: TRANSFER_MANAGER, transferManager: await st.getTransferManager() })

      const percentageTM = await st.getPercentageTM()
      if (percentageTM) {
        dispatch(percentageTransferManager(
          percentageTM,
          await percentageTM.paused(),
          await percentageTM.maxHolderPercentage()
        ))
      }
    }

    const { transferManager, percentageTM: { contract: percentageTM } } = getState().whitelist
    const investors = await transferManager.getWhitelist()
    if (percentageTM) {
      const percentages = await percentageTM.getWhitelist()
      for (let i = 0; i < investors.length; i++) {
        for (let percentage: Investor of percentages) {
          if (investors[i].address === percentage.address) {
            investors[i].isPercentage = percentage.isPercentage
          }
        }
      }
    }
    dispatch({ type: WHITELIST, investors })

    dispatch(ui.fetched())
  } catch (e) {
    dispatch(ui.fetchingFailed(e))
  }
}

export const uploadCSV = (file: Object) => async (dispatch: Function) => {
  const reader = new FileReader()
  reader.readAsText(file)
  reader.onload = () => {
    const investors: Array<Investor> = []
    const criticals: Array<InvestorCSVRow> = []
    let isTooMany = false
    let string = 0
    // $FlowFixMe
    for (let entry of reader.result.split(/\r\n|\n/)) {
      string++
      const [address, sale, purchase, expiryIn, isPercentageIn] = entry.split(',')
      const handleDate = (d: string) => d === '' ? new Date(PERMANENT_LOCKUP_TS) : new Date(Date.parse(d))
      const from = handleDate(sale)
      const to = handleDate(purchase)
      const expiry = new Date(Date.parse(expiryIn))
      const isPercentage = typeof isPercentageIn === 'string' && isPercentageIn.toLowerCase() === 'true'
      if (
        ethereumAddress(address) === null && !isNaN(from) && !isNaN(to) && !isNaN(expiry)
        && (isPercentage || isPercentageIn === '' || isPercentageIn === undefined)
      ) {
        if (investors.length === 75) {
          isTooMany = true
          continue
        }
        investors.push({ address, from, to, expiry, isPercentage })
      } else {
        criticals.push([string, address, sale, purchase, expiryIn, isPercentageIn])
      }
    }
    dispatch({ type: UPLOADED, investors, criticals, isTooMany })
  }
}

export const importWhitelist = () => async (dispatch: Function, getState: GetState) => {
  const {
    uploaded,
    transferManager,
    percentageTM: { contract: percentageTM, isPaused: isPercentageDisabled },
  } = getState().whitelist
  dispatch(ui.tx(
    ['Submitting approved investors', ...(!isPercentageDisabled ? ['Setting ownership restrictions'] : [])],
    async () => {
      await transferManager.modifyWhitelistMulti(uploaded)
      if (!isPercentageDisabled) { // $FlowFixMe
        await percentageTM.modifyWhitelistMulti(uploaded)
      }
    },
    'Investors has been added successfully',
    () => {
      dispatch(resetUploaded())
      return dispatch(fetchWhitelist())
    },
    undefined,
    undefined,
    true // TODO @bshevchenko
  ))
}

export const addInvestor = () => async (dispatch: Function, getState: GetState) => {
  const { values } = getState().form[addInvestorFormName]
  const investor: Investor = {
    address: values.address,
    from: new Date(values.permanentSale ? PERMANENT_LOCKUP_TS : values.sale),
    to: new Date(values.permanentPurchase ? PERMANENT_LOCKUP_TS : values.purchase),
    expiry: new Date(values.expiry),
  }
  const { transferManager, percentageTM: { contract: percentageTM } } = getState().whitelist

  dispatch(ui.tx(
    ['Submitting approved investor', ...(values.isPercentage ? ['Setting ownership restriction'] : [])],
    async () => {
      await transferManager.modifyWhitelist(investor)
      if (values.isPercentage) {
        investor.isPercentage = true // $FlowFixMe
        await percentageTM.modifyWhitelist(investor)
      }
    },
    'Investor has been added successfully',
    () => {
      return dispatch(fetchWhitelist())
    },
    undefined,
    undefined,
    true // TODO @bshevchenko
  ))
}

export const editInvestors = (addresses: Array<Address>) => async (dispatch: Function, getState: GetState) => {
  const { values } = getState().form[editInvestorsFormName]
  const investor: Investor = {
    address: '', // we need e_ prefix to prevent names overlapping since we load both Add and Edit forms simultaneously
    from: new Date(values['e_permanentSale'] ? PERMANENT_LOCKUP_TS : values.sale),
    to: new Date(values['e_permanentPurchase'] ? PERMANENT_LOCKUP_TS : values.purchase),
    expiry: new Date(values.expiry),
    isPercentage: values['e_isPercentage'] || false,
  }
  const investors = []
  for (let i = 0; i < addresses.length; i++) {
    investors.push({ ...investor, address: addresses[i] })
  }
  const {
    transferManager,
    percentageTM: { contract: percentageTM, isPaused: isPercentageDisabled },
  } = getState().whitelist

  dispatch(ui.tx(
    ['Updating lockup dates', ...(!isPercentageDisabled ? ['Updating ownership restrictions'] : [])],
    async () => {
      await transferManager.modifyWhitelistMulti(investors)
      if (!isPercentageDisabled) { // $FlowFixMe
        await percentageTM.modifyWhitelistMulti(investors)
      }
    },
    'Lockup dates has been updated successfully',
    () => {
      return dispatch(fetchWhitelist())
    },
    undefined,
    undefined,
    true // TODO @bshevchenko
  ))
}

export const removeInvestors = (addresses: Array<Address>) => async (dispatch: Function, getState: GetState) => {
  const investors: Array<Investor> = []
  for (let i = 0; i < addresses.length; i++) {
    const removeInvestor: Investor = {
      address: addresses[i],
      from: new Date(0),
      to: new Date(0),
      expiry: new Date(0),
    }
    investors.push(removeInvestor)
  }
  const { transferManager } = getState().whitelist
  const plural = addresses.length > 1 ? 's' : ''

  dispatch(ui.tx(
    `Removing investor${plural}`,
    async () => {
      await transferManager.modifyWhitelistMulti(investors)
    },
    `Investor${plural} has been removed successfully`,
    () => {
      return dispatch(fetchWhitelist())
    },
    undefined,
    undefined,
    true // TODO @bshevchenko
  ))
}

export const enableOwnershipRestrictions = (percentage?: number) => async (dispatch: Function, getState: GetState) => {
  dispatch(ui.confirm(
    <div>
      <p>
        Please confirm that you want to enable Percentage Ownership Restrictions.
        This operation requires a wallet transaction to pay for the mining fee.
      </p>
      <p>
        Once you hit &laquo;CONFIRM&raquo;, Percentage Ownership Restrictions will be enabled.
        If you would like to disable Percentage Ownership Restrictions, you can toggle it off.
        This operation will also require a wallet transaction to pay for the mining fee.
        If you do not wish to enable Percentage Ownership Restrictions or wish to review your information,
        simply hit &laquo;CANCEL&raquo;.
      </p>
      <br />
      <ui.Remark title='Note'>
        Please make sure to enable this functionality after some amount of tokens has been minted for your
        reserve or your affiliates. Percentage Ownership is calculated based on the token total supply.
        As such, if zero tokens have been minted, no transaction will be allowed as it would result in
        the Investor owning 100% of the total supply.
      </ui.Remark>
    </div>,
    async () => { // $FlowFixMe
      const tm = getState().whitelist.percentageTM.contract
      if (tm) {
        dispatch(ui.tx(
          'Resuming ownership restrictions',
          async () => {
            await tm.unpause()
          },
          'Ownership restrictions has been resumed successfully',
          () => {
            dispatch(percentageTransferManager(tm, false))
            return dispatch(fetchWhitelist())
          },
          undefined,
          undefined,
          true // TODO @bshevchenko
        ))
      } else { // $FlowFixMe
        const st: SecurityToken = getState().token.token.contract
        dispatch(ui.tx(
          'Enabling ownership restrictions',
          async () => {
            await st.setPercentageTM(percentage)
          },
          'Ownership restrictions has been enabled successfully',
          async () => {
            dispatch(percentageTransferManager(await st.getPercentageTM(), false, percentage))
            return dispatch(fetchWhitelist())
          },
          undefined,
          undefined,
          true // TODO @bshevchenko
        ))
      }
    }
  ))
}

export const disableOwnershipRestrictions = () => async (dispatch: Function, getState: GetState) => {
  dispatch(ui.confirm(
    <div>
      <p>
        Please confirm that you want to disable the restrictions on Percentage Ownership.
        This operation requires a wallet transaction to pay for the mining fee (aka gas fee).
      </p>
      <p>
        Once you hit &laquo;CONFIRM&raquo;, restrictions on Percentage Ownership will be disabled.
        Re-enabling restrictions on Percentage Ownership will require a new wallet transaction to pay for the mining
        fee. If you wish to maintain existing Percentage Ownership restrictions or review your information,
        simply select &laquo;CANCEL&raquo;.
      </p>
    </div>,
    async () => {
      const tm = getState().whitelist.percentageTM.contract
      dispatch(ui.tx(
        'Pausing ownership restrictions',
        async () => { // $FlowFixMe
          await tm.pause()
        },
        'Ownership restrictions has been paused successfully',
        async () => {
          dispatch(percentageTransferManager(tm, true))
          return dispatch(fetchWhitelist())
        },
        undefined,
        undefined,
        true // TODO @bshevchenko
      ))
    }
  ))
}

export const updateOwnershipPercentage = (percentage: number) => async (dispatch: Function, getState: GetState) => {
  const tm = getState().whitelist.percentageTM.contract
  dispatch(ui.tx(
    'Updating ownership percentage',
    async () => { // $FlowFixMe
      await tm.changeHolderPercentage(percentage)
    },
    'Ownership percentage has been successfully updated',
    async () => {
      dispatch(percentageTransferManager(tm, false, percentage))
      return dispatch(fetchWhitelist())
    },
    undefined,
    undefined,
    true // TODO @bshevchenko
  ))
}

export const getFreezeStatus = () => async (dispatch: Function, getState: GetState) => {
  // noinspection JSIgnoredPromiseFromCall $FlowFixMe
  getState().token.token.contract.subscribe('LogFreezeTransfers', {}, (event) => { // eslint-disable-next-line
    dispatch({ type: FREEZE_STATUS, freezeStatus: !!event.returnValues._freeze })
  }) // $FlowFixMe
  const frozenInit = await getState().token.token.contract.freeze()
  dispatch({ type: FREEZE_STATUS, freezeStatus: frozenInit })
  dispatch({ type: FROZEN_MODAL_STATUS, isFrozenModalOpen: frozenInit })
}

export const toggleFreeze = () =>
  async (dispatch: Function, getState: GetState) => {
    const { freezeStatus } = getState().whitelist
    dispatch(ui.tx(
      [freezeStatus ? 'Resuming Token Transfers': 'Pausing Token Transfers'],
      async () => {
        if (freezeStatus) { // $FlowFixMe
          await getState().token.token.contract.unfreezeTransfers()
        } else { // $FlowFixMe
          await getState().token.token.contract.freezeTransfers()
        }
      },
      freezeStatus ? 'Successfully Resumed Token Transfers': 'Successfully Paused Token Transfers',
      () => {
        dispatch(showFrozenModal(!freezeStatus))
        dispatch(getFreezeStatus())
      },
      undefined,
      undefined,
      true
    ))
  }
