import { PaginationDto } from '../../merchant/dto/pagination.dto.js';

/** Admin eligible-order queue: HOME_DELIVERY orders that are READY with no active assignment, or
 * DELIVERY_FAILED (awaiting reassignment). Paginated like every other admin list. */
export class ListEligibleOrdersDto extends PaginationDto {}
