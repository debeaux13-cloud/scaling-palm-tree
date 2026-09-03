import { start } from 'workflow/api';
import { runDirectFulfillment } from './direct-preview';
import { mutateOrder } from './orders';

async function fulfillPaidOrder(orderId: string) {
  'use step';
  try {
    await runDirectFulfillment(orderId);
  } catch (error) {
    await mutateOrder(orderId, (order) => {
      if (order.continuationStatus === 'planning') order.continuationStatus = 'failed';
    });
    throw error;
  }
}

export async function paidFulfillmentWorkflow(orderId: string) {
  'use workflow';
  await fulfillPaidOrder(orderId);
}

export async function startPaidFulfillment(orderId: string) {
  return start(paidFulfillmentWorkflow, [orderId]);
}
