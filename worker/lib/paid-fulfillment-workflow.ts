import { start } from 'workflow/api';
import { runDirectFulfillment } from './direct-preview';

async function fulfillPaidOrder(orderId: string) {
  'use step';
  await runDirectFulfillment(orderId);
}

export async function paidFulfillmentWorkflow(orderId: string) {
  'use workflow';
  await fulfillPaidOrder(orderId);
}

export async function startPaidFulfillment(orderId: string) {
  return start(paidFulfillmentWorkflow, [orderId]);
}
