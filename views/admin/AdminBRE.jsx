import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from '@/lib/router';
import { adminAPI, breAPI } from '@/lib/api';
import RuleEditor from '@/components/admin/RuleEditor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { PageLoader } from '@/components/ui/PageLoader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Trash2,
  Shield,
  ShieldCheck,
  History as HistoryIcon,
  GitBranch,
  FlaskConical,
  MapPin,
  ArrowLeft,
  Search,
  BookOpen,
  Filter,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';

// Modular BRE Components
import CrifTestPanel from '@/components/admin/CrifTestPanel';
import RulesTable from '@/components/admin/bre/RulesTable';
import CategoriesTable from '@/components/admin/bre/CategoriesTable';
import FieldsMasterTable from '@/components/admin/bre/FieldsMasterTable';
import PolicyWorkspace from '@/components/admin/bre/PolicyWorkspace';
import BRESimulator from '@/components/admin/bre/BRESimulator';
import AuditHistory from '@/components/admin/bre/AuditHistory';
import BlockedLocationsSheet from '@/components/admin/bre/BlockedLocationsSheet';

import { Card, CardContent } from '@/components/ui/card';

export default function AdminBRE() {
  const navigate = useNavigate();
  // State
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [auditHistory, setAuditHistory] = useState([]);
  const [blockedLocations, setBlockedLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

  // UI Flow State
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showPolicyBuilder, setShowPolicyBuilder] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState(null);
  const [selectedFieldDetail, setSelectedFieldDetail] = useState(null);
  const [showBlockedLocationSheet, setShowBlockedLocationSheet] = useState(false);
  const [blockedTab, setBlockedTab] = useState('current');
  
  // Simulation State
  const [simulatorId, setSimulatorId] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // Blocked Location Form
  const [locationForm, setLocationForm] = useState({
    block_type: 'pincode',
    value: '',
    reason: ''
  });
  const [blockingLocation, setBlockingLocation] = useState(false);

  // Data Fetching Functions
  const fetchRules = useCallback(async () => {
    try {
      const res = await breAPI.getRules();
      setRules(res.data || []);
    } catch (err) {
      setError('Failed to load rules.');
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await breAPI.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      setError('Failed to load categories.');
    }
  }, []);

  const fetchFields = useCallback(async () => {
    try {
      const res = await breAPI.getFields();
      setFields(res.data || []);
    } catch (err) {
      setError('Failed to load fields.');
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await breAPI.getPolicies();
      setPolicies(res.data || []);
    } catch (err) {
      setError('Failed to load policies.');
    }
  }, []);

  const fetchPendingReviewsCount = useCallback(async () => {
    try {
      const res = await breAPI.getPendingManualReviews();
      const list = Array.isArray(res.data) ? res.data : res.data?.reviews || [];
      setPendingReviewsCount(list.length);
    } catch (err) {
      // Count is informational only — don't block BRE config UI
      console.warn('Failed to load pending review count:', err);
    }
  }, []);

  const fetchAuditHistory = useCallback(async () => {
    try {
      const res = await breAPI.getHistory();
      setAuditHistory(res.data || []);
    } catch (err) {
      setError('Failed to load audit history.');
    }
  }, []);

  const fetchBlockedLocations = useCallback(async () => {
    try {
      const res = await adminAPI.getBlockedLocations();
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.locations)
          ? res.data.locations
          : [];
      setBlockedLocations(list);
    } catch (err) {
      console.error('Blocked locations:', err);
      setBlockedLocations([]);
      setError('Failed to load blocked locations.');
    }
  }, []);

  // Initialize data based on active tab
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === 'rules') {
          await Promise.all([
            fetchRules(),
            fetchCategories(),
            fetchFields(),
            fetchPolicies(),
            fetchPendingReviewsCount(),
          ]);
        } else if (activeTab === 'policies') {
          await Promise.all([fetchPolicies(), fetchRules(), fetchCategories()]);
        } else if (activeTab === 'categories') {
          await Promise.all([fetchCategories(), fetchRules()]);
        } else if (activeTab === 'fields') {
          await Promise.all([fetchFields(), fetchBlockedLocations()]);
        } else if (activeTab === 'history') {
          await fetchAuditHistory();
        }
      } catch (err) {
        console.error('BRE Init Error:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [activeTab, fetchRules, fetchCategories, fetchFields, fetchPolicies, fetchPendingReviewsCount, fetchAuditHistory, fetchBlockedLocations]);

  // Actions
  const handleSaveRule = useCallback(async (ruleData) => {
    setEditorLoading(true);
    try {
      if (editingRule) {
        await breAPI.updateRule(editingRule.id, ruleData);
      } else {
        await breAPI.createRule(ruleData);
      }
      await fetchRules();
      setShowEditor(false);
      setEditingRule(null);
    } catch (err) {
      setError('Failed to save rule.');
    } finally {
      setEditorLoading(false);
    }
  }, [editingRule, fetchRules]);

  const handleDeleteRule = useCallback(async () => {
    if (!ruleToDelete) return;
    try {
      await breAPI.deleteRule(ruleToDelete);
      await fetchRules();
      setShowDeleteDialog(false);
      setRuleToDelete(null);
    } catch (err) {
      setError('Failed to delete rule.');
    }
  }, [ruleToDelete, fetchRules]);

  const handleToggleRule = useCallback(async (id, currentStatus) => {
    const nextActive = !currentStatus;
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: nextActive ? 1 : 0 } : r))
    );
    try {
      await breAPI.toggleRule(id, nextActive);
    } catch (err) {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: currentStatus ? 1 : 0 } : r))
      );
      setError('Failed to toggle rule status.');
    }
  }, []);

  const handleSavePolicy = useCallback(async (policyData) => {
    try {
      if (editingPolicy) {
        await breAPI.updatePolicy(editingPolicy.id, policyData);
      } else {
        await breAPI.createPolicy(policyData);
      }
      await fetchPolicies();
      setShowPolicyBuilder(false);
      setEditingPolicy(null);
    } catch (err) {
      setError('Failed to save policy.');
    }
  }, [editingPolicy, fetchPolicies]);

  const handleTogglePolicy = useCallback(async (id, currentStatus) => {
    try {
      await breAPI.updatePolicy(id, { is_active: !currentStatus });
      await fetchPolicies();
    } catch (err) {
      setError('Failed to toggle policy.');
    }
  }, [fetchPolicies]);

  const handleSimulate = useCallback(async () => {
    if (!simulatorId) return;
    setSimulating(true);
    setSimulationResult(null);
    try {
      const data = await breAPI.simulateEvaluation({ applicationId: simulatorId });
      setSimulationResult(data);
    } catch (err) {
      setError('Simulation failed. Check application ID.');
    } finally {
      setSimulating(false);
    }
  }, [simulatorId]);

  const handleAddBlockedLocation = useCallback(async () => {
    if (!locationForm.value) return;
    setBlockingLocation(true);
    try {
      await adminAPI.addBlockedLocation(locationForm);
      await fetchBlockedLocations();
      setLocationForm({ block_type: 'pincode', value: '', reason: '' });
      setBlockedTab('current');
    } catch (err) {
      setError('Failed to block location.');
    } finally {
      setBlockingLocation(false);
    }
  }, [locationForm, fetchBlockedLocations]);

  const handleRemoveBlockedLocation = useCallback(async (id) => {
    try {
      await adminAPI.removeBlockedLocation(id);
      await fetchBlockedLocations();
    } catch (err) {
      setError('Failed to remove blocked location.');
    }
  }, [fetchBlockedLocations]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const matchesSearch = rule.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           rule.rule_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'active' && rule.is_active) || 
                            (statusFilter === 'inactive' && !rule.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [rules, searchQuery, statusFilter]);

  const openEditor = useCallback((rule = null) => {
    setEditingRule(rule);
    setShowEditor(true);
  }, []);

  const openDeleteDialog = useCallback((id) => {
    setRuleToDelete(id);
    setShowDeleteDialog(true);
  }, []);

  // Helper for Unified Navigation Label & Icon
  const getTabDetails = useCallback((tab) => {
    const tabs = {
      rules: { label: 'Individual Rules', icon: Shield },
      policies: { label: 'Rule Groups', icon: GitBranch },
      categories: { label: 'Categories', icon: CheckCircle },
      fields: { label: 'Fields Master', icon: MapPin },
      simulator: { label: 'Test Scenario', icon: FlaskConical },
      history: { label: 'History', icon: HistoryIcon },
      'crif-test': { label: 'CRIF Live Test', icon: ShieldCheck }
    };
    return tabs[tab] || tabs.rules;
  }, []);

  const currentTab = useMemo(() => getTabDetails(activeTab), [activeTab, getTabDetails]);

  // Stats for Overview Cards — Manual Reviews KPI links to Applications under_review queue
  const stats = useMemo(() => ([
    { title: 'Total Rules', value: rules.length, subtitle: `${rules.filter(r => r.is_active).length} Active`, icon: Shield, color: 'blue' },
    {
      title: 'Under Review Cases',
      value: pendingReviewsCount,
      subtitle: 'Open in Applications',
      icon: Clock,
      color: 'amber',
      onClick: () => navigate('/admin/applications?status=under_review'),
    },
    { title: 'Active Policies', value: policies.filter(p => p.is_active).length, subtitle: `Of ${policies.length} total`, icon: GitBranch, color: 'indigo' },
    { title: 'Categories', value: categories.length, subtitle: 'Business Groups', icon: CheckCircle, color: 'emerald' },
  ]), [rules, pendingReviewsCount, policies, categories, navigate]);

  if (loading && rules.length === 0 && activeTab === 'rules') {
    return <PageLoader text="Loading Rule Engine..." minHeight="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-gray-50/40 pb-24  space-y-8 max-w-[1600px] mx-auto">
      
      {/* Header & Stats Section */}
      {!showEditor && !showPolicyBuilder && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <h1 className="text-4xl tracking-tight text-slate-900 font-medium">Decision Rules</h1>
                    <p className="text-base font-normal text-slate-500">Configure automated logic for loan eligibility and risk assessment.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group/search">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Search rules..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 w-64 text-sm bg-white border-slate-200 rounded-lg transition-all font-normal"
                            disabled={activeTab !== 'rules'}
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-white border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-5 h-11 font-normal transition-all shadow-sm active:scale-95 flex items-center gap-2 group"
                            >
                                <currentTab.icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                <span className="hidden sm:inline">{currentTab.label}</span>
                                <span className="w-px h-4 bg-slate-200 mx-1 hidden sm:inline" />
                                <Filter className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                <span className="sm:hidden">Filter</span>
                                {(statusFilter !== 'all' || searchQuery) && (
                                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[320px] rounded-lg border-slate-200/60 shadow-2xl p-4">
                            <DropdownMenuLabel className="text-[11px] font-normal text-slate-400 uppercase tracking-widest px-2 py-2">Workspace View</DropdownMenuLabel>
                            <div className="grid grid-cols-1 gap-1 mb-4">
                                {['rules', 'policies', 'categories', 'fields', 'simulator', 'history', 'crif-test'].map(tab => {
                                    const details = getTabDetails(tab);
                                    const Icon = details.icon;
                                    return (
                                        <DropdownMenuItem 
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`rounded-lg px-3 py-3 text-sm font-normal flex items-center justify-between cursor-pointer transition-colors ${
                                                activeTab === tab ? 'bg-slate-900 text-white' : 'focus:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className={`w-4 h-4 ${activeTab === tab ? 'text-white' : 'text-slate-400'}`} />
                                                {details.label}
                                            </div>
                                            {details.count > 0 && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-normal ${
                                                    activeTab === tab ? 'bg-white text-slate-950' : 'bg-red-500 text-white'
                                                }`}>
                                                    {details.count}
                                                </span>
                                            )}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </div>

                            <DropdownMenuSeparator className="my-2 bg-slate-100" />
                            <DropdownMenuLabel className="text-[11px] font-normal text-slate-400 uppercase tracking-widest px-2 py-2">Filter Records</DropdownMenuLabel>
                            
                            <div className="grid grid-cols-1 gap-1 mt-2">
                                <DropdownMenuCheckboxItem 
                                    checked={statusFilter === 'all'}
                                    onCheckedChange={() => setStatusFilter('all')}
                                    className="rounded-lg px-3 py-2.5 text-xs font-normal flex items-center gap-2 cursor-pointer focus:bg-slate-50 transition-colors"
                                    disabled={activeTab !== 'rules'}
                                >
                                    All Rules
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem 
                                    checked={statusFilter === 'active'}
                                    onCheckedChange={() => setStatusFilter('active')}
                                    className="rounded-lg px-3 py-2.5 text-xs font-normal flex items-center gap-2 cursor-pointer focus:bg-slate-50 transition-colors"
                                    disabled={activeTab !== 'rules'}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                                    Active Only
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem 
                                    checked={statusFilter === 'inactive'}
                                    onCheckedChange={() => setStatusFilter('inactive')}
                                    className="rounded-lg px-3 py-2.5 text-xs font-normal flex items-center gap-2 cursor-pointer focus:bg-slate-50 transition-colors"
                                    disabled={activeTab !== 'rules'}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1" />
                                    Inactive Only
                                </DropdownMenuCheckboxItem>
                            </div>
                            
                            {(statusFilter !== 'all' || searchQuery) && activeTab === 'rules' && (
                                <>
                                    <DropdownMenuSeparator className="my-2 bg-slate-100" />
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="w-full justify-center text-[10px] uppercase tracking-wider font-normal text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg h-10"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setStatusFilter('all');
                                        }}
                                    >
                                        Clear All Filters
                                    </Button>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setActiveTab(activeTab)} 
                        className="bg-white border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-5 h-11 font-normal transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button 
                        size="sm" 
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 h-11 font-normal shadow-lg shadow-slate-200 transition-all hover:translate-y-[-1px] active:scale-95"
                        onClick={() => openEditor()}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Rule
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 rounded-lg animate-shake">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Workspace */}
      {!showEditor ? (
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {/* The multi-tab list has been moved to the View & Filter dropdown in the header for a cleaner UI */}
            <div className="transition-all duration-500 mt-8">
              <TabsContent value="rules">
                <RulesTable 
                  rules={filteredRules} 
                  editorLoading={editorLoading} 
                  openEditor={openEditor} 
                  handleToggleRule={handleToggleRule} 
                  openDeleteDialog={openDeleteDialog} 
                />
              </TabsContent>

              <TabsContent value="policies">
                <PolicyWorkspace
                  showPolicyBuilder={showPolicyBuilder}
                  setShowPolicyBuilder={setShowPolicyBuilder}
                  editingPolicy={editingPolicy}
                  setEditingPolicy={setEditingPolicy}
                  policies={policies}
                  rules={rules}
                  categories={categories}
                  handleSavePolicy={handleSavePolicy}
                  handleTogglePolicy={handleTogglePolicy}
                />
                
                {/* Visual Guide for Policies */}
                {!showPolicyBuilder && (
                  <Card className="mt-8 border-dashed border-blue-200 bg-blue-50/20 rounded-lg overflow-hidden">
                    <CardContent className="p-8 flex items-start gap-6">
                      <div className="p-4 bg-blue-100 rounded-lg text-blue-600 shrink-0">
                        <BookOpen size={24} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-lg font-medium text-slate-900 tracking-tight">Understanding Rule Groups (Policies)</h4>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                          A Rule Group is a collection of individual rules that are applied to a loan application together. 
                          You can create multiple groups (e.g., "Silver Tier", "Premium Tier") and set one as the **Default** which will be used for all new applications.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="categories">
                <CategoriesTable 
                  categories={categories} 
                  rules={rules} 
                  setSelectedCategoryDetail={setSelectedCategoryDetail} 
                />
              </TabsContent>

              <TabsContent value="fields">
                <FieldsMasterTable 
                  fields={fields} 
                  blockedLocations={blockedLocations} 
                  setSelectedFieldDetail={setSelectedFieldDetail} 
                  setShowBlockedLocationSheet={setShowBlockedLocationSheet} 
                />
              </TabsContent>

              <TabsContent value="simulator">
                <BRESimulator 
                  simulatorId={simulatorId} 
                  setSimulatorId={setSimulatorId} 
                  simulating={simulating} 
                  handleSimulate={handleSimulate} 
                  simulationResult={simulationResult} 
                />
              </TabsContent>

              <TabsContent value="history">
                <AuditHistory auditHistory={auditHistory} />
              </TabsContent>

              <TabsContent value="crif-test">
                <CrifTestPanel />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    onClick={() => {
                        setShowEditor(false);
                        setEditingRule(null);
                    }}
                    className="gap-2 text-gray-500 hover:text-gray-900 rounded-lg"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Rules
                </Button>
                <div className="h-6 w-px bg-gray-200" />
                <h1 className="text-2xl tracking-tight text-gray-900 font-medium">
                    {editingRule ? 'Edit Rule' : 'Create New Rule'}
                </h1>
            </div>

            <Card className="border-gray-100 shadow-sm rounded-lg bg-white overflow-hidden">
                <CardContent className="p-0">
                    {editorLoading ? (
                      <div className="flex min-h-[400px] items-center justify-center">
                        <Spinner className="w-8 h-8 text-blue-600" />
                      </div>
                    ) : (
                      <RuleEditor
                          rule={editingRule}
                          rules={rules}
                          fields={fields}
                          categories={categories}
                          onSave={handleSaveRule}
                          onCancel={() => {
                              setShowEditor(false);
                              setEditingRule(null);
                          }}
                      />
                    )}
                </CardContent>
            </Card>
        </div>
      )}

      {/* Shared Modals and Sheets */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="rounded-lg p-5 border-gray-100 shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-medium text-gray-900 tracking-tight">Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium text-gray-600 font-medium leading-relaxed mt-2">
                        This action cannot be undone. This will permanently delete the business rule and remove it from all linked policies.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-8 gap-3">
                    <AlertDialogCancel className="rounded-lg border-gray-100 font-medium h-11 px-4">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteRule} className="bg-red-600 hover:bg-red-700 text-white rounded-lg h-11 px-4 font-medium">
                        Delete Rule
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>

      {/* Detail Sheets */}
      <Sheet open={Boolean(selectedCategoryDetail)} onOpenChange={(open) => !open && setSelectedCategoryDetail(null)}>
        <SheetContent className="sm:max-w-3xl rounded-l-[2rem] border-gray-100 shadow-2xl">
          <SheetHeader className="p-4 border-b border-gray-50">
            <SheetTitle className="text-xl font-medium text-gray-900">{selectedCategoryDetail?.category_name || 'Category Details'}</SheetTitle>
            <SheetDescription className="text-xs font-medium">Business group details used by decision rules.</SheetDescription>
          </SheetHeader>
          {selectedCategoryDetail && (
            <div className="space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
              <DetailRow label="Status" value={selectedCategoryDetail.is_active ? 'Active' : 'Inactive'} />
              <DetailRow label="Display Order" value={selectedCategoryDetail.display_order ?? '-'} />
              <DetailRow
                label="Linked Rules"
                value={rules.filter((rule) => String(rule.category_id) === String(selectedCategoryDetail.id)).length}
              />
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">Description</div>
                <div className="mt-3 text-sm leading-7 text-slate-700 font-medium">
                  {selectedCategoryDetail.category_description || 'No description added.'}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selectedFieldDetail)} onOpenChange={(open) => !open && setSelectedFieldDetail(null)}>
        <SheetContent className="sm:max-w-3xl rounded-l-[2rem] border-gray-100 shadow-2xl">
          <SheetHeader className="p-4 border-b border-gray-50">
            <SheetTitle className="text-xl font-medium text-gray-900">{selectedFieldDetail?.field_label || selectedFieldDetail?.field_key || 'Field Details'}</SheetTitle>
            <SheetDescription className="text-xs font-medium">Field information used by the decision rule builder.</SheetDescription>
          </SheetHeader>
          {selectedFieldDetail && (
            <div className="space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
              <DetailRow label="Field Key" value={selectedFieldDetail.field_key} mono />
              <DetailRow label="Type" value={selectedFieldDetail.field_type || '-'} />
              <DetailRow label="Business Group" value={selectedFieldDetail.field_category || '-'} />
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">Allowed Checks</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Array.isArray(selectedFieldDetail.allowed_operators) ? selectedFieldDetail.allowed_operators : []).map((operator) => (
                    <span key={operator} className="text-[10px] font-mono bg-white border border-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                      {operator}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">Help Text</div>
                <div className="mt-3 text-sm leading-7 text-slate-700 font-medium">
                  {selectedFieldDetail.help_text || selectedFieldDetail.field_description || 'No help text available.'}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <BlockedLocationsSheet
        isOpen={showBlockedLocationSheet}
        onOpenChange={setShowBlockedLocationSheet}
        blockedTab={blockedTab}
        setBlockedTab={setBlockedTab}
        error={error}
        blockedLocations={blockedLocations}
        handleRemoveBlockedLocation={handleRemoveBlockedLocation}
        locationForm={locationForm}
        setLocationForm={setLocationForm}
        blockingLocation={blockingLocation}
        handleAddBlockedLocation={handleAddBlockedLocation}
      />

    </div>
  );
}

// Internal Helper Components
function StatCard({ title, value, subtitle, icon: Icon, color, onClick }) {
    const colorStyles = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    };

    const interactive = typeof onClick === 'function';

    return (
        <Card
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          onClick={interactive ? onClick : undefined}
          onKeyDown={interactive ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          } : undefined}
          className={`border shadow-sm rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${colorStyles[color]} ${interactive ? 'cursor-pointer' : ''}`}
        >
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1 font-medium">{title}</p>
                        <h3 className="text-2xl tracking-tighter text-slate-900 font-medium">{value}</h3>
                        <p className="text-[11px] opacity-60 mt-1 font-medium inline-flex items-center gap-1">
                          {subtitle}
                          {interactive && <ExternalLink className="w-3 h-3 opacity-70" />}
                        </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-white shadow-sm border border-inherit">
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DetailRow({ label, value, mono = false }) {
    return (
        <div className="rounded-lg border border-slate-50 bg-white p-5 shadow-sm">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">{label}</div>
            <div className={`mt-2 text-sm text-slate-900 font-medium ${mono ? 'font-mono break-all bg-slate-50 px-3 py-2 rounded-lg border border-slate-100' : ''}`}>{value}</div>
        </div>
    );
}
