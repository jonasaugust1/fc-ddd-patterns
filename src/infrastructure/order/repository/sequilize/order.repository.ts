import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import OrderRepositoryInterface from "../../../../domain/checkout/repository/order-repository.interface";
import ProductModel from "../../../product/repository/sequelize/product.model";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";

export default class OrderRepository implements OrderRepositoryInterface {
  async find(id: string): Promise<Order> {
    const orderModel = await OrderModel.findByPk(id, {
      include: [{model: OrderItemModel, as: 'items'}]
    });

    const orderItems = orderModel.items.map(item => 
      new OrderItem(
        item.id, 
        item.name, 
        item.price, 
        item.product_id, 
        item.quantity));

    return new Order(orderModel.id, orderModel.customer_id, orderItems);
  }

  
  async findAll(): Promise<Order[]> {
    const orderModels = await OrderModel.findAll({
      include: [{model: OrderItemModel, as: 'items'}]
    });

    return orderModels.map((orderModel) => {
      const orderItems = orderModel.items.map((item) => {
        return new OrderItem(item.id, item.name, item.price, item.product_id, item.quantity);
      });

      return new Order(orderModel.id, orderModel.customer_id, orderItems);
    });
  }

  async create(entity: Order): Promise<void> {
    try {
      await OrderModel.create(
        {
          id: entity.id,
          customer_id: entity.customerId,
          total: entity.total(),
          items: entity.items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            product_id: item.productId,
            quantity: item.quantity,
          })),
        },
        {
          include: [{ model: OrderItemModel }],
        }
      );
    } catch (error) {
      console.log(error)
    }
  }

  async update(entity: Order): Promise<void> {
    try {
      await OrderModel.update(
        {
          customer_id: entity.customerId,
          total: entity.total(),
        },
        {
          where: { id: entity.id },
        }
      );
  
      const order = await OrderModel.findByPk(entity.id, {
        include: [{ model: OrderItemModel, as: 'items' }], 
      });
  
      if (!order) {
        throw new Error(`Order with id ${entity.id} not found.`);
      }
  
      await Promise.all(
        entity.items.map(async (item) => {
          let orderItem = await OrderItemModel.findOrCreate({
            where: { id: item.id }, 
            defaults: {
              name: item.name,
              price: item.price,
              product_id: item.productId,
              quantity: item.quantity,
              order_id: entity.id, 
            },
          });
  
          if (!orderItem[1]) {
            await orderItem[0].update({
              name: item.name,
              price: item.price,
              product_id: item.productId,
              quantity: item.quantity,
            });
          }
        })
      );
    } catch (error) {
      console.error('Error occurred during order update:', error);
      throw error;
    }
  }  
}
