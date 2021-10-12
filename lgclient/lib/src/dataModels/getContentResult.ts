import GeneralResult from './generalResult';

/*api/content/{id}的响应结果 */
export default interface GetContentResult extends GeneralResult {
    /**package content */
    content: string;
}