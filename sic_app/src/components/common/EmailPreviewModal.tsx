import React, { useState } from 'react'
import { Eye, Mail, Send } from 'lucide-react'
import { Modal, ModalFooter } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useEmailPreview } from '@/api/hooks'
import { EmailPreviewRequest } from '@/types/api'
import toast from 'react-hot-toast'

interface EmailPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId?: number
  templateId?: number
  tone?: string
  onSend?: () => void
}

export function EmailPreviewModal({
  isOpen,
  onClose,
  invoiceId,
  templateId,
  tone = 'friendly',
  onSend,
}: EmailPreviewModalProps) {
  const [isSending, setIsSending] = useState(false)
  
  const emailPreviewMutation = useEmailPreview()

  // Generate preview when modal opens
  React.useEffect(() => {
    if (isOpen && invoiceId) {
      const request: EmailPreviewRequest = {
        invoice_id: invoiceId,
        ...(templateId ? { template_id: templateId } : { tone }),
      }
      emailPreviewMutation.mutate(request)
    }
  }, [isOpen, invoiceId, templateId, tone])

  const handleSend = async () => {
    if (!onSend) return
    
    setIsSending(true)
    try {
      await onSend()
      toast.success('Email sent successfully!')
      onClose()
    } catch (error) {
      toast.error('Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  const preview = emailPreviewMutation.data
  const isLoading = emailPreviewMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Email Preview"
      size="lg"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating preview...
            </div>
          </div>
        ) : emailPreviewMutation.isError ? (
          <div className="text-center py-8">
            <div className="text-error-600 dark:text-error-400 mb-2">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Failed to generate preview
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please try again or check your template settings.
            </p>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {/* Subject Line */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {preview.subject}
                </p>
              </div>
            </div>

            {/* Email Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="bg-white dark:bg-gray-800 p-4 max-h-96 overflow-y-auto">
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: preview.body }}
                  />
                </div>
              </div>
            </div>

            {/* Mobile-friendly preview toggle */}
            <MobilePreviewToggle html={preview.body} subject={preview.subject} />
          </div>
        ) : (
          <div className="text-center py-8">
            <Eye className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">No preview available</p>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        {preview && onSend && (
          <Button
            variant="primary"
            onClick={handleSend}
            isLoading={isSending}
            disabled={isLoading}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}

// Mobile preview component
function MobilePreviewToggle({ 
  html, 
  subject 
}: { 
  html: string
  subject: string 
}) {
  const [showMobilePreview, setShowMobilePreview] = useState(false)

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMobilePreview(!showMobilePreview)}
        className="mb-3"
      >
        📱 {showMobilePreview ? 'Hide' : 'Show'} Mobile Preview
      </Button>

      {showMobilePreview && (
        <div className="mx-auto max-w-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 p-2">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm min-h-96">
            {/* Mobile email header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                  <Mail className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  DueSpark
                </span>
              </div>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {subject}
              </p>
            </div>
            
            {/* Mobile email body */}
            <div className="p-3">
              <div 
                className="text-xs prose prose-xs dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
                style={{ fontSize: '12px', lineHeight: '1.4' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}