import React from 'react'
import ReactPaginate from 'react-paginate'
import GR from '~/locale'
export default ({ pageCount, onPageChange }) => {
  return (
    <ReactPaginate
      previousLabel={GR.lastpage}
      nextLabel={GR.nextpage}
      breakLabel={<span> ...</span>}
      breakClassName={'break-me'}
      pageCount={pageCount}
      marginPagesDisplayed={2}
      pageRangeDisplayed={5}
      onPageChange={(e) => onPageChange(e)}
      containerClassName={'pagination'}
      subContainerClassName={'pages pagination'}
      activeClassName={'active'}
    />
  )
}
