import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { DeliveryPartnerService } from './delivery-partner.service.js';
import { DeliveryAssignmentService } from './delivery-assignment.service.js';
import { DeliveryWorkflowService } from './delivery-workflow.service.js';
import { DeliveryVerificationService } from './delivery-verification.service.js';
import { DeliveryCodService } from './delivery-cod.service.js';
import { AdminDeliveryPartnersController } from './admin-delivery-partner.controller.js';
import { AdminDeliveryAssignmentsController } from './admin-delivery-assignment.controller.js';
import { DeliveryPartnerController } from './delivery-partner.controller.js';
import { DeliveryWorkflowController } from './delivery-workflow.controller.js';
import { MerchantDeliveryController } from './merchant-delivery.controller.js';
import { CustomerDeliveryController } from './customer-delivery.controller.js';

@Module({
    imports: [InventoryModule, OrdersModule],
    controllers: [
        AdminDeliveryPartnersController,
        AdminDeliveryAssignmentsController,
        DeliveryPartnerController,
        DeliveryWorkflowController,
        MerchantDeliveryController,
        CustomerDeliveryController,
    ],
    providers: [
        DeliveryPartnerService,
        DeliveryAssignmentService,
        DeliveryWorkflowService,
        DeliveryVerificationService,
        DeliveryCodService,
    ],
    exports: [DeliveryPartnerService, DeliveryAssignmentService, DeliveryWorkflowService],
})
export class DeliveryModule {}
