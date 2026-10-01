import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { 
  Play, 
  Terminal, 
  Zap,
  Info 
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import BREExplanationPanel from '@/components/admin/BREExplanationPanel';

const MiniWorkspaceStat = ({ label, value }) => (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-lg text-gray-900 font-medium">{value}</div>
    </div>
);

export default function BRESimulator({ 
    simulatorId, 
    setSimulatorId, 
    simulating, 
    handleSimulate, 
    simulationResult 
}) {
  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
      <div className="rounded-lg border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.12),_transparent_32%),linear-gradient(135deg,#ffffff_0%,#fffdfa_45%,#fff8eb_100%)] p-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-slate-950 p-3 text-white shadow-sm">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Scenario Testing Area</div>
            <div className="mt-1 text-xl tracking-tight text-slate-950">Test how rules affect a loan</div>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 font-medium">
              Enter an Application ID (e.g., APP123) to see if it would be approved or rejected under the current rules. This is a "dry run" and won't change any actual data.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-gray-100 shadow-sm rounded-lg">
            <CardHeader className="p-5">
              <CardTitle className="text-sm tracking-tight text-gray-900">Test a Scenario</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500">Application Number</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. APP-001" 
                    className="h-10 rounded-lg border-gray-100 bg-gray-50/50" 
                    value={simulatorId}
                    onChange={(e) => setSimulatorId(e.target.value)}
                  />
                  <Button 
                    variant="slate" 
                    className="h-10 rounded-lg px-4 bg-slate-900 hover:bg-slate-800"
                    disabled={!simulatorId || simulating}
                    onClick={handleSimulate}
                  >
                    {simulating ? <Spinner className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-4">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                    This uses the "Default Policy" to check the application eligibility.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {simulationResult ? (
            <Card className="border-gray-100 shadow-sm rounded-lg overflow-hidden min-h-[400px]">
              <CardHeader className="bg-gray-50/50 border-b border-gray-50 p-5 flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm tracking-tight text-gray-900">Test Result</CardTitle>
                  <CardDescription className="text-[10px] mt-1 font-medium uppercase tracking-wider">Results for {simulationResult.application_number}</CardDescription>
                </div>
                <Badge 
                  className={`rounded-lg px-3 py-1 text-[11px] font-medium ${
                    simulationResult.decision === 'approved' ? 'bg-green-100 text-green-700' :
                    simulationResult.decision === 'manual_review' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}
                >
                  {simulationResult.decision?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Approval Score</span>
                        <div className="text-2xl text-gray-900 font-medium">{simulationResult.approvalScore}%</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Checks Performed</span>
                        <div className="text-2xl text-gray-900 font-medium">{simulationResult.evaluationTrail?.length || 0}</div>
                    </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-xs uppercase tracking-[0.1em] text-gray-400 font-medium flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5" />
                      Decision Breakdown
                   </h4>
                   <BREExplanationPanel 
                     explanation={simulationResult.explanation}
                     title="AI Logic Bridge"
                   />

                   <div className="space-y-2 mt-4">
                      {simulationResult.evaluationTrail?.map((trial, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-50 bg-white text-xs">
                           <div className="flex gap-3 items-center">
                              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-[10px] text-gray-500">{idx+1}</span>
                              <span className="text-gray-900 font-medium">{trial.rule_name}</span>
                           </div>
                           <Badge variant={trial.passed ? "secondary" : "outline"} className={`text-[10px] font-medium ${trial.passed ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                             {trial.passed ? 'PASSED' : trial.failure_action?.toUpperCase()}
                           </Badge>
                        </div>
                      ))}
                   </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/30 p-12 text-center">
              <div className="h-16 w-16 rounded-lg bg-white shadow-sm flex items-center justify-center mb-4">
                 <Zap className="w-8 h-8 text-amber-500 opacity-20" />
              </div>
              <h3 className="text-sm text-gray-900 font-medium tracking-tight mb-2">Simulation Ready</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[240px]">
                No simulation results to display. Enter an ID and trigger the console to start diagnosis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
