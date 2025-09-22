import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileSpreadsheet, Users, Mail, Zap, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingButton, ProcessStatus } from '@/components/ui/LoadingStates'
import { Card, CardContent } from '@/components/ui/Card'
import { apiClient } from '@/api/client'
import { toast } from 'react-hot-toast'
import { displayError } from '@/utils/errorHandling'
import type { User, ImportResponse } from '@/types/api'

interface InvoiceImportStepProps {
  user: User | undefined
  onNext: () => void
  onBack: () => void
  isLoading: boolean
}

export function InvoiceImportStep({ user, onNext, isLoading }: InvoiceImportStepProps) {
  const queryClient = useQueryClient()
  const [selectedOption, setSelectedOption] = useState<'import' | 'sample' | null>(null)

  // Import sample data
  const importSampleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<ImportResponse>('/onboarding/sample-data')
      return response.data
    },
    onSuccess: (data) => {
      toast.success(`Successfully created ${data.clients_created} clients and ${data.invoices_created} sample invoices!`)

      // Track event
      apiClient.post('/events', {
        entity_type: 'user',
        entity_id: user?.id,
        event_type: 'sample_data_imported',
        payload: {
          clients_created: data.clients_created,
          invoices_created: data.invoices_created
        }
      })

      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })

      // Don't auto-advance - let user see what was imported and manually proceed
    },
    onError: (error: any) => {
      displayError(error, {
        operation: 'import_sample_data',
        component: 'InvoiceImportStep'
      })
    }
  })

  // Skip import (proceed without data)
  const skipImportMutation = useMutation({
    mutationFn: async () => {
      // Track event
      await apiClient.post('/events', {
        entity_type: 'user',
        entity_id: user?.id,
        event_type: 'import_skipped',
        payload: { reason: 'manual_setup_preferred' }
      })
      return true
    },
    onSuccess: () => {
      toast.success('Setup complete! You can add clients and invoices manually.')

      // Don't auto-advance - let user manually proceed with completion button
    }
  })

  const handleImportSample = () => {
    setSelectedOption('sample')
    importSampleMutation.mutate()
  }

  const handleSkipImport = () => {
    setSelectedOption('import')
    skipImportMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <FileSpreadsheet className="h-12 w-12 text-primary-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Import Your Data
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Get started quickly with sample data or begin with a clean slate.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sample Data Option */}
        <Card className={`cursor-pointer transition-all hover:shadow-lg ${
          selectedOption === 'sample'
            ? 'ring-2 ring-primary-500 border-primary-200'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <CardContent className="p-6">
            <div className="text-center">
              <Zap className="h-8 w-8 text-green-600 mx-auto mb-4" />

              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Start with Sample Data
              </h4>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Perfect for trying out SIC features with realistic demo data.
              </p>

              <div className="space-y-2 text-xs text-left mb-6">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>3 demo clients with contact information</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>6 sample invoices with various statuses</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Pre-configured reminder schedules</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Experience all features immediately</span>
                </div>
              </div>

              <LoadingButton
                onClick={handleImportSample}
                isLoading={importSampleMutation.isPending}
                loadingText="Creating sample data..."
                className="w-full"
              >
                Import Sample Data
              </LoadingButton>
            </div>
          </CardContent>
        </Card>

        {/* Manual Setup Option */}
        <Card className={`cursor-pointer transition-all hover:shadow-lg ${
          selectedOption === 'import'
            ? 'ring-2 ring-primary-500 border-primary-200'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <CardContent className="p-6">
            <div className="text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-4" />

              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Start Fresh
              </h4>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Begin with an empty account and add your real clients and invoices.
              </p>

              <div className="space-y-2 text-xs text-left mb-6">
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Clean slate for your actual data</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Add clients and invoices manually</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>No demo data to clean up later</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Professional setup from day one</span>
                </div>
              </div>

              <LoadingButton
                onClick={handleSkipImport}
                isLoading={skipImportMutation.isPending}
                loadingText="Setting up your account..."
                variant="outline"
                className="w-full"
              >
                Start Fresh
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Preview (if sample data selected) */}
      {importSampleMutation.isPending && (
        <div className="flex justify-center">
          <ProcessStatus
            status="loading"
            message="Creating your sample data with demo clients, invoices, and reminders..."
          />
        </div>
      )}

      {/* Reminder Preview */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <div className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                Reminder Preview
              </div>
              <div className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                Here's what your clients will receive when invoices become overdue:
              </div>
              <div className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                <div className="text-sm">
                  <div className="font-medium text-gray-900 dark:text-white mb-2">
                    Subject: Payment Reminder - Invoice #INV-001
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Hi [Client Name],<br/><br/>

                    We hope this message finds you well. This is a friendly reminder that your invoice
                    is now due for payment.<br/><br/>

                    <strong>Invoice Details:</strong><br/>
                    • Invoice #: INV-001<br/>
                    • Amount: $250.00<br/>
                    • Due Date: [Due Date]<br/><br/>

                    Please process the payment at your earliest convenience.<br/><br/>

                    Thank you for your business!<br/>
                    [Your Name]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Helpful Tips */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          💡 Getting Started Tips
        </h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div>• <strong>Sample Data:</strong> Great for exploring features and testing workflows</div>
          <div>• <strong>Start Fresh:</strong> Professional approach when you're ready to go live</div>
          <div>• <strong>Reminders:</strong> Automatically sent based on your schedule preferences</div>
          <div>• <strong>Templates:</strong> Customize reminder messages in Settings later</div>
        </div>
      </div>
    </div>
  )
}
