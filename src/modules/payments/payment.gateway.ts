export interface DepositRequest {
  depositId: string;
  provider: string;
  phoneNumber: string;
  amountCdf: number;
}

export type DepositState =
  | { status: 'not_found' }
  | { status: 'pending' | 'failed' | 'succeeded'; depositId: string; amountCdf: number;
      currency: string; country: string; provider: string; phoneNumber: string };

export interface PaymentGateway {
  initiate(input: DepositRequest): Promise<'accepted' | 'rejected' | 'duplicate'>;
  getStatus(depositId: string): Promise<DepositState>;
}
