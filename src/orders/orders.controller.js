const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res) {
  const { dishId } = req.params;
  res.json({
    data: orders.filter(dishId ? (use) => order.id == dishId : () => true),
  });
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({
      status: 400,
      message: `Must include a ${propertyName}`,
    });
  };
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order id not found: ${orderId}`,
  });
}

function read(req, res, next) {
  res.json({ data: res.locals.order });
}

function orderIdInBodyMatchRouteOrderId(req, res, next) {
  const { data: { id } = {} } = req.body;
  const { orderId } = req.params;
  if (id && id !== orderId) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
    });
  }
  next();
}

function statusIsValid(req, res, next) {
  const { data: { status } = {} } = req.body;
  const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];
  if (validStatus.includes(status)) {
    return next();
  }
  next({
    status: 400,
    message:
      "Order must have a status of pending, preparing, out-for-delivery, delivered",
  });
}

function dishesIsNotEmpty(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if ((dishes && dishes.length == 0) || !Array.isArray(dishes)) {
    return next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }
  next();
}

function quantityIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  dishes.forEach((dish, index) => {
    if (dish.quantity == 0 || !Number.isInteger(dish.quantity)) {
      return next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  });
  next();
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo: deliverTo,
    mobileNumber: mobileNumber,
    dishes: dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function update(req, res) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  if (status !== "delivered") {
    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.status = status;
    order.dishes = dishes;
    res.json({ data: order });
  }
}

function isStatusPending(req, res, next) {
  const order = res.locals.order;
  if (order.status === "pending") {
    next();
  }
  return next({
    status: 400,
    message: "Only pending orders can be canceled",
  });
}

function destroy(req, res) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  const deletedOrders = orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [
    dishesIsNotEmpty,
    quantityIsValid,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    create,
  ],
  update: [
    orderExists,
    orderIdInBodyMatchRouteOrderId,
    dishesIsNotEmpty,
    quantityIsValid,
    statusIsValid,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("status"),
    bodyDataHas("dishes"),
    update,
  ],
  read: [orderExists, orderIdInBodyMatchRouteOrderId, read],
  delete: [orderExists, isStatusPending, destroy],
};
