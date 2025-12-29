import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Check, 
  X, 
  AlertTriangle, 
  GitCompare,
  ChefHat,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { COGSDebugData } from '@/hooks/useHotelPLData';

interface COGSSyncVerificationProps {
  cogsDebugData: COGSDebugData[];
  hotelPLCOGS: number;
  departmentPLCOGS: { department: string; displayName: string; cogs: number }[];
  currencySymbol: string;
}

interface SyncResult {
  department: string;
  displayName: string;
  hotelPLCOGS: number;
  departmentPLCOGS: number;
  difference: number;
  percentageDiff: number;
  isSynced: boolean;
  reason?: string;
}

export function COGSSyncVerification({
  cogsDebugData,
  hotelPLCOGS,
  departmentPLCOGS,
  currencySymbol,
}: COGSSyncVerificationProps) {
  const formatCurrency = (amount: number) => `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const syncResults = useMemo((): SyncResult[] => {
    return cogsDebugData.map((debugDept) => {
      const deptPL = departmentPLCOGS.find(d => d.department === debugDept.department);
      const hotelValue = debugDept.totalCOGS;
      const deptValue = deptPL?.cogs ?? 0;
      const difference = Math.abs(hotelValue - deptValue);
      const avgValue = (hotelValue + deptValue) / 2;
      const percentageDiff = avgValue > 0 ? (difference / avgValue) * 100 : 0;
      
      // Consider synced if difference is less than 1 currency unit or less than 0.1%
      const isSynced = difference < 1 || percentageDiff < 0.1;
      
      let reason: string | undefined;
      if (!isSynced) {
        if (hotelValue > deptValue) {
          reason = 'Hotel P/L includes more orders or uses different date filtering';
        } else {
          reason = 'Department P/L includes more orders or uses different date filtering';
        }
      }
      
      return {
        department: debugDept.department,
        displayName: debugDept.displayName,
        hotelPLCOGS: hotelValue,
        departmentPLCOGS: deptValue,
        difference,
        percentageDiff,
        isSynced,
        reason,
      };
    });
  }, [cogsDebugData, departmentPLCOGS]);

  const totalHotelPLCOGS = cogsDebugData.reduce((sum, d) => sum + d.totalCOGS, 0);
  const totalDepartmentPLCOGS = departmentPLCOGS.reduce((sum, d) => sum + d.cogs, 0);
  const totalDifference = Math.abs(totalHotelPLCOGS - totalDepartmentPLCOGS);
  const overallSynced = totalDifference < 1;
  const syncedCount = syncResults.filter(r => r.isSynced).length;
  const syncPercentage = (syncedCount / syncResults.length) * 100;

  return (
    <div className="space-y-4">
      {/* Overall Sync Status */}
      <Card className={overallSynced ? 'border-green-500/50 bg-green-500/5' : 'border-amber-500/50 bg-amber-500/5'}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="h-5 w-5" />
            COGS Sync Status
            {overallSynced ? (
              <Badge className="bg-green-100 text-green-700 border-green-300 ml-2">
                <Check className="h-3 w-3 mr-1" />
                All Synced
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {syncResults.length - syncedCount} Discrepancies
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Comparing Hotel P/L COGS with individual Department P/L reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-background border">
              <ChefHat className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Hotel P/L Total</p>
              <p className="text-xl font-bold">{formatCurrency(totalHotelPLCOGS)}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <ArrowRight className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className={`text-sm font-medium ${overallSynced ? 'text-green-600' : 'text-amber-600'}`}>
                  {overallSynced ? 'Matched' : `Δ ${formatCurrency(totalDifference)}`}
                </p>
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background border">
              <Calculator className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Department P/L Total</p>
              <p className="text-xl font-bold">{formatCurrency(totalDepartmentPLCOGS)}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Sync Progress</span>
              <span className="font-medium">{syncedCount}/{syncResults.length} departments synced</span>
            </div>
            <Progress 
              value={syncPercentage} 
              className={`h-2 ${overallSynced ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-Department Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department-by-Department Comparison</CardTitle>
          <CardDescription>
            Detailed sync verification for each F&B department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {syncResults.map((result) => (
              <div 
                key={result.department}
                className={`p-4 rounded-lg border ${
                  result.isSynced 
                    ? 'bg-green-500/5 border-green-500/20' 
                    : 'bg-amber-500/5 border-amber-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.displayName}</span>
                    {result.isSynced ? (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        <Check className="h-3 w-3 mr-1" />
                        Synced
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                        <X className="h-3 w-3 mr-1" />
                        Mismatch
                      </Badge>
                    )}
                  </div>
                  {!result.isSynced && (
                    <span className="text-sm text-amber-600 font-medium">
                      Δ {formatCurrency(result.difference)} ({result.percentageDiff.toFixed(2)}%)
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between p-2 rounded bg-background">
                    <span className="text-muted-foreground">Hotel P/L COGS:</span>
                    <span className="font-medium">{formatCurrency(result.hotelPLCOGS)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-background">
                    <span className="text-muted-foreground">Dept P/L COGS:</span>
                    <span className="font-medium">{formatCurrency(result.departmentPLCOGS)}</span>
                  </div>
                </div>
                
                {!result.isSynced && result.reason && (
                  <p className="mt-2 text-sm text-amber-700 bg-amber-100/50 p-2 rounded">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Possible cause: {result.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Methodology Explanation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sync Verification Methodology</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">What we compare:</strong> COGS values from Hotel P/L aggregated view vs. individual department P/L reports for the same date range.
          </p>
          <p>
            <strong className="text-foreground">Sync criteria:</strong> Values are considered synced if the difference is less than {currencySymbol}1 or less than 0.1%.
          </p>
          <p>
            <strong className="text-foreground">Common causes of discrepancy:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Different order filtering logic (status filters, date boundaries)</li>
            <li>Rounding differences in ingredient cost calculations</li>
            <li>Missing recipe data for some menu items</li>
            <li>Inventory cost price updates during the period</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
