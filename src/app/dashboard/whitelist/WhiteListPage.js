//@flow

import React, { Component } from 'react'
import { connect } from 'react-redux'
import DocumentTitle from 'react-document-title'
import uuidv4 from 'uuid/v4'
import {
  DataTable,
  PaginationV2,
  Modal,
  ModalWrapper,
  DatePicker,
  DatePickerInput,
  FileUploaderButton,
} from "carbon-components-react"

import type { Investor } from 'polymathjs/types'
import { TransferManager } from 'polymathjs'
import type { EventData } from './actions'
import { initialize, uploadCSV, multiUserSubmit, oneUserSubmit, getWhitelist, listLength, removeInvestor, editInvestors } from './actions'
import { TableHeaders } from './tableHeaders'
import InvestorForm from './userForm'
import EditInvestorsForm from './editInvestorsForm'

//might need TableToolbarAction and batchActionClick here
const { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow,
  TableSelectAll, TableSelectRow, TableToolbar, TableBatchAction, TableBatchActions,
  TableToolbarSearch, TableToolbarContent } = DataTable

type StateProps = {|
  transferManager: TransferManager,
  addresses: Array<string>,
  sell: Array<number>,
  buy: Array<number>,
  investors: Array<Investor>,
  // investorsPaginated: Array<Array<EventData>>,
  csvMessage: string,
  modalShowing: boolean, //TODO: rename this to say previewCSVShowing
  listLength: number,
|}

type DispatchProps = {|
  initialize: () => any,
  handleUpload: () => any,
  multiSubmit: () => any,
  singleSubmit: () => any,
  getWhitelist: (?Date, ?Date) => any,
  // paginationDivider: () => any,
  updateListLength: (any) => any,
  removeInvestor: (any) => any,
  editInvestors: (any) => any,
|}

const mapStateToProps = (state) => ({
  transferManager: state.whitelist.transferManager,
  addresses: state.whitelist.addresses,
  sell: state.whitelist.sell,
  buy: state.whitelist.buy,
  investors: state.whitelist.investors,
  investorsPaginated: state.whitelist.investorsPaginated,
  csvMessage: state.whitelist.csvMessage,
  modalShowing: state.whitelist.modalShowing,
  listLength: state.whitelist.listLength,
})

const mapDispatchToProps = (dispatch: Function) => ({
  initialize: () => dispatch(initialize()),
  handleUpload: (e) => dispatch(uploadCSV(e)),
  multiSubmit: () => dispatch(multiUserSubmit()),
  singleSubmit: () => dispatch(oneUserSubmit()),
  getWhitelist: (calenderStart, calenderEnd) => dispatch(getWhitelist(calenderStart, calenderEnd)),
  // paginationDivider: () => dispatch(paginationDivider()),
  updateListLength: (e) => dispatch(listLength(e)),
  removeInvestor: (e) => dispatch(removeInvestor(e)),
  editInvestors: (e) => dispatch(editInvestors(e)),

})

type Props = StateProps & DispatchProps

type State = {
  page: number,
  editInvestorsShowing: boolean,
  editInvestors: Array<string>,
}

const dateFormat = (date: Date) => date.toLocaleDateString('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

class WhitelistPage extends Component<Props, State> {
  state = {
    page: 0,
    editInvestorsShowing: false,
    editInvestors: [],
  }

  componentWillMount () {
    this.props.initialize()
  }

  paginationRendering () {
    let paginatedArray = []
    let investors = this.props.investors
    console.log(investors)
    let pageNum = this.state.page
    let listLength = this.props.listLength
    let startSlice = pageNum*listLength
    let endSlice = ((pageNum+1)*listLength)

    paginatedArray = this.props.investors.slice(startSlice, endSlice)

    // console.log(paginatedArray)

    let stringifiedArray = []
    for (let i = 0; i <paginatedArray.length; i++){
      let csvRandomID = uuidv4() //TODO: only use this function here, which means all other data from before should be investor data
      let stringifyAdded = dateFormat(paginatedArray[i].added)
      let stringifyFrom = dateFormat(paginatedArray[i].from)
      let stringifyTo = dateFormat(paginatedArray[i].to)

      let stringifyInvestor: EventData = {
        id: csvRandomID,
        address: paginatedArray[i].address,
        added: stringifyAdded,
        addedBy: paginatedArray[i].addedBy,
        from: stringifyFrom,
        to: stringifyTo,
      }
      stringifiedArray.push(stringifyInvestor)
    }
    return stringifiedArray
  }

  handleInvestorSubmit = () => {
    this.props.singleSubmit()
  }

  handleChangePages = (e) => {
    this.props.updateListLength(e.pageSize)
    // this.props.paginationDivider() //TODO: i dont want to have to call this here, need to rework updateListLength, cuz it falls if i remove this function
    this.setState({
      page: (e.page - 1),
    })
  }

  handleDatePicker = (picker) => {
    if (picker.length === 2){
      this.setState({
        page: 0, //reset to initial page , othewise it might refer to a page that doesnt exist
      })
      this.props.getWhitelist(picker[0],picker[1])
    }
  }

  handleEditInvestors = (investors) => {
    let addresses = []
    for (let i = 0; i < investors.length; i++) {
      addresses.push(investors[i].cells[0].value)
    }
    this.setState({
      editInvestorsShowing: true,
      editInvestors: addresses,
    })
  }

  handleRequestSubmit = () => {
    this.props.editInvestors(this.state.editInvestors)
    this.setState({
      editInvestorsShowing: false,
    })
  }

  handleRequestClose = () => {
    this.setState({
      editInvestorsShowing: false,
    })
  }

  removeInvestor = (e) => {
    let addresses = []
    for (let i = 0; i < e.length; i++) {
      addresses.push(e[i].cells[0].value)
    }
    this.props.removeInvestor(addresses)
  }

  onHandleMultiSubmit = () => {
    this.props.multiSubmit()
    return true //needed for the component from carbon to work properly
  }

  dataTableRender = ({
    rows,
    headers,
    getHeaderProps,
    getSelectionProps,
    getBatchActionProps,
    onInputChange,
    selectedRows,
  }) => (
    <TableContainer>
      <TableToolbar>
        <TableBatchActions {...getBatchActionProps()}>
          <TableBatchAction onClick={()=> this.removeInvestor(selectedRows)}>
              Remove Investor
          </TableBatchAction>
          <TableBatchAction onClick={()=> this.handleEditInvestors(selectedRows)}>
              Edit Sale/Purchase Lockup Dates
          </TableBatchAction>
        </TableBatchActions>
        <TableToolbarSearch onChange={onInputChange} />
        <TableToolbarContent>
          <ModalWrapper
            id='transactional-modal'
            buttonTriggerText='Add New'
            modalHeading='Add New Investor'
            onSubmit={this.handleInvestorSubmit}
            shouldCloseAfterSubmit
          >
            <p className='bx--modal-content__text'>
                Please enter the information below to add a single investor.
            </p>
            <br />
            <InvestorForm onSubmit={this.handleInvestorSubmit} />
          </ModalWrapper>
        </TableToolbarContent>
      </TableToolbar>
      <Table>
        <TableHead>
          <TableRow>
            <TableSelectAll {...getSelectionProps()} />
            {headers.map((header) => (
              <TableHeader {...getHeaderProps({ header })}>
                {header.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableSelectRow {...getSelectionProps({ row })} />
              {row.cells.map((cell) => (
                <TableCell key={cell.id}>{cell.value}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )

  render () {
    // console.log("HOW MANY TIMES DOES THIS RENDER????")

    //function to call at render, that splits up the full investor list and only renders the ten or so needed.
    // also , apply the date format thing   right here
    let paginatedRows =  this.paginationRendering()
    console.log(paginatedRows)
    return (
      <DocumentTitle title='Sign Up – Polymath'>

        <div className='bx--grid'>
          <div className='bx--row'>
            <div className='bx--col-xs-6'>
              <h2>Whitelist</h2>
              <br />

              <ModalWrapper
                id='input-modal'
                buttonTriggerText='Import Whitelist'
                modalLabel=''
                modalHeading='Import Whitelist'
                handleSubmit={this.onHandleMultiSubmit}
                primaryButtonText='Send To Blockchain'
                shouldCloseAfterSubmit
              >
                <div>
                  Add multiple addresses to the whisstelist by uploading a comma seperated CSV file. The format should be as follows:
                  <br /><br />
                  <ul>
                    <li>Column 1 - Ethereum Address</li>
                    <li>Column 2 - Sell Restriction (mm/dd/yyyy)</li>
                    <li>Column 2 - Buy Restriction (mm/dd/yyyy)</li>
                  </ul>
                </div>
                <br />
                <FileUploaderButton
                  labelText='Upload From Desktop'
                  className='bob'
                  onChange={this.props.handleUpload}
                  accept={[".csv"]}
                  multiple
                  buttonKind='secondary'
                />

                {this.props.modalShowing ? (
                  <div>
                    <div>{this.props.csvMessage}</div>
                    <p className='bx--modal-content__text'>
                      <strong>Below is the data you will be sending to the blockchain, please confirm it is correct, and then click the Send button to continue.</strong>
                    </p>
                    <br />
                    {this.props.addresses.map((user, i) => (
                      <div key={uuidv4()}>
                        <div>Address: {this.props.addresses[i]}</div>
                        <div>Sell Expiry Time: {this.props.sell[i]}</div>
                        <div>Buy Expiry Time: {this.props.buy[i]}</div>
                        <br />
                      </div>
                    ))}
                  </div>
                )
                  : null}
              </ModalWrapper>
              <br />

            </div>
          </div>
          <div className='bx--row'>

            <div className='bx--col-xs-2'>
              <DatePicker id='date-picker' onChange={this.handleDatePicker} datePickerType='range'>
                <DatePickerInput
                  className='some-class'
                  labelText='Start'
                  placeholder='mm/dd/yyyy'
                  id='date-picker-input-id'
                />
                <DatePickerInput
                  className='some-class'
                  labelText='End'
                  placeholder='mm/dd/yyyy'
                  id='date-picker-input-id-2'
                />
              </DatePicker>
            </div>
          </div>

          <br /> <br />
          <DataTable
            rows={paginatedRows}
            headers={TableHeaders}
            render={this.dataTableRender}
          />
          <PaginationV2
            onChange={this.handleChangePages}
            pageSizes={[10, 20, 30, 40, 50]}
            totalItems={this.props.investors.length}

          />
          {this.state.editInvestorsShowing ? (
            <Modal
              onRequestSubmit={this.handleRequestSubmit}
              onRequestClose={this.handleRequestClose}
              className='some-class'
              open
              modalHeading='Edit Exisiting Investors'
              primaryButtonText='Send'
              secondaryButtonText='Cancle'
            >
              <p className='bx--modal-content__text'>
                Please enter the information below to edit the chosen investors.
              </p>
              <br />
              <EditInvestorsForm onSubmit={this.handleRequestSubmit} />
            </Modal>
          )
            : null}
        </div>
      </DocumentTitle>

    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(WhitelistPage)
