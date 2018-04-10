// @flow

import { combineReducers } from 'redux'
import { reducer as form } from 'redux-form'
import { reducer as network } from 'polymath-auth'
import { reducer as pui } from 'polymath-ui'
import type { NetworkState } from 'polymath-auth/types'

import account from '../app/account/reducer'
import token from '../app/token/reducer'
import sto from '../app/sto/reducer'
import whitelist from '../app/dashboard/whitelist/reducer'
import type { WhitelistState } from '../app/dashboard/whitelist/reducer'
import type { AccountState } from '../app/account/reducer'
import type { TokenState } from '../app/token/reducer'
import type { STOState } from '../app/sto/reducer'

export default combineReducers({
  network,
  form,
  account,
  token,
  sto,
  pui,
  whitelist,
})

export type RootState = {
  network: NetworkState,
  form: any,
  account: AccountState,
  token: TokenState,
  sto: STOState,
  whitelist: WhitelistState,
}

export type GetState = () => RootState
