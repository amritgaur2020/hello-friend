import { forwardRef } from 'react';
import { format } from 'date-fns';

interface BillCharge {
  category: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

interface TaxBreakdown {
  name: string;
  percentage: number;
  amount: number;
}

interface CheckoutBillData {
  // Hotel Info
  hotelName: string;
  hotelAddress: string;
  hotelCity: string;
  hotelState: string;
  hotelPincode: string;
  hotelPhone: string;
  hotelEmail: string;
  hotelWebsite?: string;
  hotelLogo?: string;
  gstNumber?: string;
  fssaiNumber?: string;

  // Invoice Info
  invoiceNumber: string;
  invoiceDate: Date;

  // Guest Info
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestAddress?: string;

  // Stay Details
  roomNumber: string;
  roomType: string;
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
  numGuests: number;

  // Charges
  charges: BillCharge[];
  taxes: TaxBreakdown[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  grandTotal: number;

  // Payment
  advancePaid: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
  paymentStatus: string;

  // Currency
  currencySymbol: string;
}

// Convert number to words (Indian format)
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
  };

  if (num === 0) return 'Zero';
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = numToWords(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + numToWords(paise) + ' Paise';
  }
  result += ' Only';
  
  return result;
};

export interface CheckoutBillPrintRef {
  print: () => void;
}

interface CheckoutBillPrintProps {
  data: CheckoutBillData;
}

export const CheckoutBillPrint = forwardRef<HTMLDivElement, CheckoutBillPrintProps>(
  ({ data }, ref) => {
    return (
      <div ref={ref} className="bg-white text-black p-8 max-w-[210mm] mx-auto font-sans text-sm">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          {data.hotelLogo && (
            <img src={data.hotelLogo} alt="Hotel Logo" className="h-16 mx-auto mb-2" />
          )}
          <h1 className="text-2xl font-bold uppercase tracking-wide">{data.hotelName}</h1>
          <p className="text-sm mt-1">
            {data.hotelAddress}{data.hotelCity && `, ${data.hotelCity}`}
            {data.hotelState && `, ${data.hotelState}`}{data.hotelPincode && ` - ${data.hotelPincode}`}
          </p>
          <p className="text-sm">
            Phone: {data.hotelPhone} | Email: {data.hotelEmail}
            {data.hotelWebsite && ` | ${data.hotelWebsite}`}
          </p>
          {data.gstNumber && <p className="text-sm font-semibold mt-1">GSTIN: {data.gstNumber}</p>}
          {data.fssaiNumber && <p className="text-sm font-semibold">FSSAI Lic: {data.fssaiNumber}</p>}
        </div>

        {/* Invoice Title */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold border-2 border-black inline-block px-8 py-1">TAX INVOICE</h2>
        </div>

        {/* Invoice & Guest Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="space-y-1">
            <p><span className="font-semibold">Invoice No:</span> {data.invoiceNumber}</p>
            <p><span className="font-semibold">Date:</span> {format(data.invoiceDate, 'dd/MM/yyyy')}</p>
          </div>
          <div className="space-y-1 text-right">
            <p><span className="font-semibold">Room No:</span> {data.roomNumber}</p>
            <p><span className="font-semibold">Room Type:</span> {data.roomType}</p>
          </div>
        </div>

        {/* Guest Details Box */}
        <div className="border border-black p-3 mb-4">
          <h3 className="font-bold mb-2 border-b border-black pb-1">GUEST DETAILS</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><span className="font-semibold">Name:</span> {data.guestName}</p>
            <p><span className="font-semibold">Phone:</span> {data.guestPhone}</p>
            {data.guestEmail && <p><span className="font-semibold">Email:</span> {data.guestEmail}</p>}
            {data.guestAddress && <p className="col-span-2"><span className="font-semibold">Address:</span> {data.guestAddress}</p>}
          </div>
        </div>

        {/* Stay Details Box */}
        <div className="border border-black p-3 mb-4">
          <h3 className="font-bold mb-2 border-b border-black pb-1">STAY DETAILS</h3>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <p><span className="font-semibold">Check-in:</span><br />{format(data.checkInDate, 'dd/MM/yyyy HH:mm')}</p>
            <p><span className="font-semibold">Check-out:</span><br />{format(data.checkOutDate, 'dd/MM/yyyy HH:mm')}</p>
            <p><span className="font-semibold">No. of Nights:</span><br />{data.nights}</p>
            <p><span className="font-semibold">No. of Guests:</span><br />{data.numGuests}</p>
          </div>
        </div>

        {/* Charges Table */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left">S.No</th>
                <th className="border border-black p-2 text-left">Description</th>
                <th className="border border-black p-2 text-center">Qty</th>
                <th className="border border-black p-2 text-right">Rate ({data.currencySymbol})</th>
                <th className="border border-black p-2 text-right">Amount ({data.currencySymbol})</th>
              </tr>
            </thead>
            <tbody>
              {data.charges.map((charge, index) => (
                <tr key={index}>
                  <td className="border border-black p-2">{index + 1}</td>
                  <td className="border border-black p-2">
                    <div className="font-medium">{charge.description}</div>
                    <div className="text-xs text-gray-600">{charge.category}</div>
                  </td>
                  <td className="border border-black p-2 text-center">{charge.quantity}</td>
                  <td className="border border-black p-2 text-right">{charge.rate.toFixed(2)}</td>
                  <td className="border border-black p-2 text-right">{charge.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end mb-4">
          <div className="w-72">
            <div className="flex justify-between py-1 border-b">
              <span>Subtotal:</span>
              <span>{data.currencySymbol}{data.subtotal.toFixed(2)}</span>
            </div>
            
            {data.taxes.map((tax, index) => (
              <div key={index} className="flex justify-between py-1 text-sm">
                <span>{tax.name} ({tax.percentage}%):</span>
                <span>{data.currencySymbol}{tax.amount.toFixed(2)}</span>
              </div>
            ))}
            
            {data.taxTotal > 0 && (
              <div className="flex justify-between py-1 border-b">
                <span>Total Tax:</span>
                <span>{data.currencySymbol}{data.taxTotal.toFixed(2)}</span>
              </div>
            )}
            
            {data.discount > 0 && (
              <div className="flex justify-between py-1 text-green-700">
                <span>Discount:</span>
                <span>-{data.currencySymbol}{data.discount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 border-t-2 border-b-2 border-black font-bold text-lg">
              <span>Grand Total:</span>
              <span>{data.currencySymbol}{data.grandTotal.toFixed(2)}</span>
            </div>
            
            {data.advancePaid > 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span>Advance Paid:</span>
                <span>-{data.currencySymbol}{data.advancePaid.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-1">
              <span>Amount Paid:</span>
              <span>{data.currencySymbol}{data.amountPaid.toFixed(2)}</span>
            </div>
            
            {data.balanceDue > 0 && (
              <div className="flex justify-between py-1 font-bold text-red-600">
                <span>Balance Due:</span>
                <span>{data.currencySymbol}{data.balanceDue.toFixed(2)}</span>
              </div>
            )}
            
            {data.balanceDue < 0 && (
              <div className="flex justify-between py-1 font-bold text-green-600">
                <span>Refund Due:</span>
                <span>{data.currencySymbol}{Math.abs(data.balanceDue).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount in Words */}
        <div className="border border-black p-3 mb-4">
          <p className="text-sm">
            <span className="font-bold">Amount in Words: </span>
            {numberToWords(data.grandTotal)}
          </p>
        </div>

        {/* Payment Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><span className="font-semibold">Payment Method:</span> {data.paymentMethod.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p><span className="font-semibold">Payment Status:</span> 
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                data.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                data.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {data.paymentStatus}
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 text-center text-sm">
          <p className="font-semibold mb-2">Thank you for staying with us!</p>
          <p className="text-xs text-gray-600">
            This is a computer-generated invoice. For any queries, please contact the front desk.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Generated on: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
          </p>
        </div>
      </div>
    );
  }
);

CheckoutBillPrint.displayName = 'CheckoutBillPrint';

export type { CheckoutBillData, BillCharge, TaxBreakdown };
