// @flow

import React, { Component } from 'react'
import DocumentTitle from 'react-document-title'
import { connect } from 'react-redux'
import { Search } from 'carbon-components-react'
import type { SecurityToken, STOFactory } from 'polymathjs/types'

import NotFoundPage from '../../NotFoundPage'
import STODetails from './STODetails'
import { fetchFactories, useFactory } from '../actions'
import type { RootState } from '../../../redux/reducer'

type StateProps = {|
  token: ?SecurityToken,
  factories: Array<STOFactory>,
|}

type DispatchProps = {|
  fetchFactories: () => any,
  useFactory: (factory: STOFactory) => any,
|}

const mapStateToProps = (state: RootState): StateProps => ({
  token: state.token.token,
  factories: state.sto.factories,
})

const mapDispatchToProps: DispatchProps = {
  fetchFactories,
  useFactory,
}

type Props = {|
|} & StateProps & DispatchProps

class SelectSTO extends Component<Props> {

  componentWillMount () {
    this.props.fetchFactories()
  }

  handleUseSTO = (sto: STOFactory) => {
    return () => this.props.useFactory(sto)
  }

  search () {
    // TODO
  }

  render () {
    const token = this.props.token
    if (!token || !token.address) {
      return <NotFoundPage /> // TODO @bshevchenko: show tip and link to complete token form instead of 404
    }
    return (
      <DocumentTitle title={'Select ' + token.ticker + ' STO – Polymath'}>
        <div>
          <div className='bx--row'>
            <div className='bx--col-xs-12'>
              <h1 className='pui-h1'>Security Token Offerings</h1>
              <h3 className='pui-h3'>
                Browse the STO models below, and choose the model that best fits your needs.<br />
                To select the model you desire, press &laquo;SELECT AND CONFIGURE STO&raquo;.
              </h3>
              <br /><br />
              <Search small labelText='Search' placeHolderText='Search' style={{ maxWidth: '612px' }} />
              <br />
              {this.props.factories.map((item) => (
                <STODetails key={item.address} item={item} handleUseSTO={this.handleUseSTO(item)} />
              ))}
            </div>
          </div>
        </div>
      </DocumentTitle>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectSTO)
