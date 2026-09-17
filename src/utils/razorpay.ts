/**
 * Utility for loading and interacting with Razorpay Checkout.js
 */

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string;
  manageKey?: string;
  notes?: Record<string, string>;
  livePayment?: boolean;
  demoMode?: boolean;
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function openRazorpayCheckout({
  orderData,
  title,
  description,
  author,
  onSuccess,
  onError,
  onClose,
}: {
  orderData: RazorpayOrderResponse;
  title: string;
  description: string;
  author?: string;
  onSuccess: (verifyResult: any) => void;
  onError: (errorMsg: string) => void;
  onClose?: () => void;
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded || !(window as any).Razorpay) {
    onError('Razorpay SDK failed to load. Please check your internet connection.');
    return;
  }

  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency || 'USD',
    name: 'stayup.lol',
    description: `${title} • ${description}`,
    order_id: orderData.orderId,
    notes: orderData.notes,
    handler: async function (response: RazorpayPaymentSuccessResponse) {
      try {
        const verifyRes = await fetch('/api/verify-razorpay-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            notes: orderData.notes,
          }),
        });

        const verifyJson = await verifyRes.json();
        if (!verifyRes.ok || !verifyJson.success) {
          throw new Error(verifyJson.error || 'Payment signature verification failed.');
        }

        onSuccess(verifyJson);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Payment verification failed';
        onError(msg);
      }
    },
    prefill: {
      name: author || 'Commander',
    },
    theme: {
      color: '#f59e0b', // Amber-500 matching stayup.lol aesthetic
    },
    modal: {
      ondismiss: function () {
        if (onClose) onClose();
      },
    },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.on('payment.failed', function (resp: any) {
    onError(resp?.error?.description || 'Payment failed or was declined.');
  });
  rzp.open();
}
