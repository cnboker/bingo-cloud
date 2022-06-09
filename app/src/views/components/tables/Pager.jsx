import ReactPaginate from 'react-paginate'
import GR from '~/locale'
import './pager.css'
export default ({ pageCount, onPageChange }) => {
  return (
    <ReactPaginate
      previousLabel={GR.lastpage}
      nextLabel={GR.nextpage}
      breakLabel={<span> ...</span>}
      breakClassName={'break-me'}
      pageCount={pageCount}
      marginPagesDisplayed={2}
      pageRangeDisplayed={3}
      onPageChange={(e) => onPageChange(e)}
      containerClassName={'pagination'}
      subContainerClassName={'pages pagination'}
      nextClassName={'page-next'}
      previousClassName={'page-previous'}
      activeClassName={'active'}
    />
  )
}
