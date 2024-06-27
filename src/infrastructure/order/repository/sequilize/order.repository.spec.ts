import { Sequelize } from "sequelize-typescript";
import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import Customer from "../../../../domain/customer/entity/customer";
import Address from "../../../../domain/customer/value-object/address";
import Product from "../../../../domain/product/entity/product";
import CustomerModel from "../../../customer/repository/sequelize/customer.model";
import CustomerRepository from "../../../customer/repository/sequelize/customer.repository";
import ProductModel from "../../../product/repository/sequelize/product.model";
import ProductRepository from "../../../product/repository/sequelize/product.repository";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";
import OrderRepository from "./order.repository";

describe("Order repository test", () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      sync: { force: true },
    });

    sequelize.addModels([
      CustomerModel,
      OrderModel,
      OrderItemModel,
      ProductModel,
    ]);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it("should create a new order", async () => {
    const customerRepository = new CustomerRepository();
    const customer = new Customer("123", "Customer 1");
    const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
    customer.changeAddress(address);
    await customerRepository.create(customer);

    const productRepository = new ProductRepository();
    const product = new Product("123", "Product 1", 10);
    await productRepository.create(product);

    const orderItem = new OrderItem(
      "1",
      product.name,
      product.price,
      product.id,
      2
    );

    const order = new Order("123", "123", [orderItem]);

    const orderRepository = new OrderRepository();
    await orderRepository.create(order);

    const orderModel = await OrderModel.findOne({
      where: { id: order.id },
      include: ["items"],
    });

    expect(orderModel.toJSON()).toStrictEqual({
      id: "123",
      customer_id: "123",
      total: order.total(),
      items: [
        {
          id: orderItem.id,
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
          order_id: "123",
          product_id: "123",
        },
      ],
    });
  });

  it("should get all orders", async () => {
    await createCustomers(3);
    const products = await createProducts(3);
    const orderRepository = new OrderRepository();
    const orders = await createOrders(orderRepository, products);
    const foundOrders = await orderRepository.findAll();
    expect(foundOrders).toEqual(orders);
  });

  it("should get an order by id", async () => {
    await createCustomers(1);
    const products = await createProducts(2);
    const orderRepository = new OrderRepository();
    const orders = await createOrders(orderRepository, products);
    const foundOrder = await orderRepository.find(orders[0].id);
    expect(foundOrder).toEqual(orders[0]);
  });

  it("should update an order", async () => {
    const customerRepository = new CustomerRepository();
    const customer = new Customer("123", "Customer 1");
    const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
    customer.changeAddress(address);
    await customerRepository.create(customer);
  
    const productRepository = new ProductRepository();
    const product = new Product("123", "Product 1", 10);
    await productRepository.create(product);
  
    const orderItem = new OrderItem(
      "1",
      product.name,
      product.price,
      product.id,
      2
    );
  
    const order = new Order("123", customer.id, [orderItem]);
  
    const orderRepository = new OrderRepository();
    await orderRepository.create(order);
  
    const product2 = new Product("345", "Product 2", 25);
    await productRepository.create(product2);
  
    const orderItem2 = new OrderItem(
      "1",
      product2.name,
      product2.price,
      product2.id,
      3
    );
  
    order.changeItems([orderItem2]);

    await orderRepository.update(order);
  
    const updatedOrder = await OrderModel.findOne({
      where: { id: order.id },
      include: [{ model: OrderItemModel }],
    });
  
    expect(updatedOrder).toBeDefined();
    expect(updatedOrder.id).toEqual(order.id);
    expect(updatedOrder.customer_id).toEqual(order.customerId);
    expect(updatedOrder.total).toEqual(75);

    expect(updatedOrder.items).toHaveLength(1);
    const updatedOrderItem = updatedOrder.items[0];
    expect(updatedOrderItem.id).toEqual(orderItem2.id);
    expect(updatedOrderItem.name).toEqual(orderItem2.name);
    expect(updatedOrderItem.price).toEqual(orderItem2.price);
    expect(updatedOrderItem.product_id).toEqual(orderItem2.productId);
    expect(updatedOrderItem.quantity).toEqual(orderItem2.quantity);
  });  
});

const createCustomers = async (quantity: number): Promise<Customer[]> => {
  const customerRepository = new CustomerRepository();

  const customers: Customer[] = [];

  for (let i = 0; i < quantity; i++) {
    const customer = new Customer(`${i}`, `Customer ${i}`);
    const address = new Address(`Street ${i}`, i + 1, `ZipCode ${i}`, `City ${i}`);

    customer.changeAddress(address);
    await customerRepository.create(customer);

    customers.push(customer);
  }

  return customers;
}

const createProducts = async (quantity: number): Promise<Product[]> => {
  const productRepository = new ProductRepository();

  const products: Product[] = [];

  for (let i = 0; i < quantity; i++) {
    const product = new Product(`${i}`, `Product ${i}`, Math.random() * 100);
    await productRepository.create(product);

    products.push(product);
  }

  return products;
}

const createOrders = async (
  orderRepository: OrderRepository,
  products: Product[]): Promise<Order[]> => {
  if (products.length === 0) {
    throw new Error("Products length must be greater than zero.");
  }

  const orders: Order[] = [];

  for (let i = 0; i < products.length; i++) {
    const orderItem = new OrderItem(
      `${i}`,
      products[i].name,
      products[i].price,
      products[i].id,
      i + 1
    );

    const order = new Order(`${i}`, `${i}`, [orderItem]);
    await orderRepository.create(order);
    orders.push(order);
  }

  return orders;
}
