import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

/** Customer-facing cart management, scoped to the authenticated user - never a client-supplied id. */
@ApiTags('customer-cart')
@Controller('customers/me/cart')
@Roles('CUSTOMER')
export class CartController {
    constructor(private readonly cart: CartService) {}

    @Get()
    @ApiOperation({ summary: "Get the caller's active cart, priced and validated." })
    @ApiOkResponse({ description: 'The cart summary (empty if no active cart exists).' })
    async getActive(@CurrentUser() user: RequestUser) {
        return this.cart.getActiveCart(user.id);
    }

    @Post('items')
    @ApiOperation({ summary: 'Add an item to the cart (creates the cart if none is active).' })
    @ApiOkResponse({ description: 'The updated cart summary.' })
    async addItem(@Body() dto: AddCartItemDto, @CurrentUser() user: RequestUser) {
        return this.cart.addItem(user.id, dto);
    }

    @Patch('items/:itemId')
    @ApiOperation({ summary: 'Set an item to an absolute quantity.' })
    @ApiOkResponse({ description: 'The updated cart summary.' })
    async updateItem(
        @Param('itemId') itemId: string,
        @Body() dto: UpdateCartItemDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.cart.updateItemQuantity(user.id, itemId, dto);
    }

    @Delete('items/:itemId')
    @ApiOperation({ summary: 'Remove an item from the cart.' })
    @ApiOkResponse({ description: 'The updated cart summary.' })
    async removeItem(@Param('itemId') itemId: string, @CurrentUser() user: RequestUser) {
        return this.cart.removeItem(user.id, itemId);
    }

    @Delete()
    @ApiOperation({ summary: "Clear (abandon) the caller's active cart." })
    @ApiOkResponse({ description: 'The (now empty) cart summary.' })
    async clear(@CurrentUser() user: RequestUser) {
        return this.cart.clearCart(user.id);
    }
}
