import { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDate, formatDateTime } from '../../utils/date';
import {
  Mail,
  Send,
  CheckCircle,
  Clock,
  MessageSquare,
  User,
  Calendar,
  ChevronLeft,
  Search,
} from 'lucide-react';

const STATUS_STYLES = {
  open: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-100',
    icon: <Clock className="size-3" />,
  },
  responded: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-100',
    icon: <MessageSquare className="size-3" />,
  },
  resolved: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-100',
    icon: <CheckCircle className="size-3" />,
  },
} as const;

type InquiryStatusFilter = 'all' | 'open' | 'responded' | 'resolved';

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function AdminInquiries() {
  const { inquiries, updateInquiry } = useData();
  const { sendInquiryResponseNotification } = useNotifications();

  const [filterStatus, setFilterStatus] = useState<InquiryStatusFilter>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 250);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pageInput, setPageInput] = useState('1');

  const inquiryCounts = useMemo(() => {
    return inquiries.reduce(
      (acc, inquiry) => {
        acc.all += 1;
        acc[inquiry.status] += 1;
        return acc;
      },
      {
        all: 0,
        open: 0,
        responded: 0,
        resolved: 0,
      } as Record<InquiryStatusFilter, number>
    );
  }, [inquiries]);

  const filteredInquiries = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    return inquiries.filter((i) => {
      const matchesStatus = filterStatus === 'all' ? true : i.status === filterStatus;

      const matchesSearch =
        q === '' ||
        i.subject?.toLowerCase().includes(q) ||
        i.message?.toLowerCase().includes(q) ||
        `${i.firstName ?? ''} ${i.lastName ?? ''}`.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [inquiries, filterStatus, debouncedSearch]);

  const sortedInquiries = useMemo(() => {
    return [...filteredInquiries].sort((a, b) => {
      const aTime = new Date(a.responseDate ?? a.date).getTime();
      const bTime = new Date(b.responseDate ?? b.date).getTime();
      return bTime - aTime;
    });
  }, [filteredInquiries]);

  const totalCount = sortedInquiries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const paginatedInquiries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedInquiries.slice(start, start + pageSize);
  }, [sortedInquiries, page, pageSize]);

  const inquiry = useMemo(() => {
    if (!selectedInquiry) return null;
    return inquiries.find((i) => i.id === selectedInquiry) ?? null;
  }, [inquiries, selectedInquiry]);

  const response = inquiry ? drafts[inquiry.id] ?? '' : '';

  useEffect(() => {
    setPage(1);
  }, [filterStatus, debouncedSearch]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    if (selectedInquiry) {
      setShowMobileDetail(true);
    }
  }, [selectedInquiry]);

  useEffect(() => {
    if (!selectedInquiry) return;

    const stillVisible = sortedInquiries.some((i) => i.id === selectedInquiry);
    if (!stillVisible) {
      setSelectedInquiry(null);
      setShowMobileDetail(false);
    }
  }, [selectedInquiry, sortedInquiries]);

  useEffect(() => {
    if (selectedInquiry || paginatedInquiries.length === 0) return;
    if (window.innerWidth >= 1024) {
      setSelectedInquiry(paginatedInquiries[0].id);
    }
  }, [selectedInquiry, paginatedInquiries]);

  const setDraftForInquiry = useCallback((inquiryId: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [inquiryId]: value,
    }));
  }, []);

  const handleRespond = useCallback(async () => {
    if (!selectedInquiry || !response.trim() || isSending) return;

    const currentInquiry = inquiries.find((i) => i.id === selectedInquiry);
    if (!currentInquiry) return;

    try {
      setIsSending(true);
      const reply = response.trim();

      await updateInquiry(selectedInquiry, {
        status: 'responded',
        response: reply,
        responseDate: new Date().toISOString(),
      });

      if (currentInquiry.userId) {
        await sendInquiryResponseNotification({
          userId: currentInquiry.userId,
          subject: currentInquiry.subject,
        });
      }

      setDrafts((prev) => ({
        ...prev,
        [selectedInquiry]: '',
      }));
    } catch (error) {
      console.error('Failed to send inquiry response:', error);
    } finally {
      setIsSending(false);
    }
  }, [
    selectedInquiry,
    response,
    isSending,
    inquiries,
    updateInquiry,
    sendInquiryResponseNotification,
  ]);

  const handleResolve = useCallback(
    async (id: string) => {
      if (isResolving) return;

      const currentInquiry = inquiries.find((i) => i.id === id);
      if (!currentInquiry) return;

      if (currentInquiry.status === 'open' && !currentInquiry.response) {
        const confirmed = window.confirm(
          'Resolve this inquiry without sending a response?'
        );
        if (!confirmed) return;
      }

      try {
        setIsResolving(true);
        await updateInquiry(id, { status: 'resolved' });
      } catch (error) {
        console.error('Failed to resolve inquiry:', error);
      } finally {
        setIsResolving(false);
      }
    },
    [inquiries, updateInquiry, isResolving]
  );

  const handlePageJump = useCallback(() => {
    const parsed = parseInt(pageInput, 10);

    if (Number.isNaN(parsed)) {
      setPageInput(String(page));
      return;
    }

    const nextPage = Math.min(Math.max(parsed, 1), totalPages);
    setPage(nextPage);
    setPageInput(String(nextPage));
  }, [pageInput, page, totalPages]);

  const handlePageInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handlePageJump();
      }
    },
    [handlePageJump]
  );

  const hasNoInquiries = totalCount === 0;

  return (
<div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div
  className={`${
    showMobileDetail ? 'hidden md:flex' : 'flex'
  } flex-col gap-4 shrink-0`}
>
  {/* Header + Filters row */}
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Support Inquiries</h1>
      <p className="text-gray-500">Respond to customer messages.</p>
    </div>

    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      {(['all', 'open', 'responded', 'resolved'] as const).map((status) => (
        <button
          key={status}
          onClick={() => setFilterStatus(status)}
          className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
            filterStatus === status
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
          <span className="ml-2 opacity-70">({inquiryCounts[status]})</span>
        </button>
      ))}
    </div>
  </div>

  {/* Full-width search */}
  <div className="relative w-full">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
    <input
      type="text"
      placeholder="Search inquiries..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
    />
  </div>
</div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 relative">
        <div
          className={`${
            showMobileDetail ? 'hidden lg:flex' : 'flex'
          } lg:w-1/3 flex-col min-h-0`}
        >
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
            {hasNoInquiries ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                <Mail className="size-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No inquiries found</p>
              </div>
            ) : (
              paginatedInquiries.map((inq) => (
                <button
                  key={inq.id}
                  onClick={() => setSelectedInquiry(inq.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedInquiry === inq.id
                      ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1 gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {formatDate(inq.date)}
                    </span>
                    <div
                      className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        STATUS_STYLES[inq.status].bg
                      } ${STATUS_STYLES[inq.status].text}`}
                    >
                      {STATUS_STYLES[inq.status].icon}
                      {inq.status}
                    </div>
                  </div>

                  <h3
                    className={`font-semibold text-sm truncate ${
                      selectedInquiry === inq.id ? 'text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    {inq.subject}
                  </h3>

                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{inq.message}</p>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 italic">
                    <User className="size-3" />
                    {inq.firstName} {inq.lastName}
                  </div>
                </button>
              ))
            )}
          </div>

          {!hasNoInquiries && totalPages > 1 && (
            <div className="mt-4 bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-4 flex flex-col gap-3">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} • {totalCount} total inquiries
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Go to</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={handlePageInputKeyDown}
                    className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handlePageJump}
                    className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Go
                  </button>
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className={`${
            !showMobileDetail ? 'hidden lg:flex' : 'flex'
          } lg:w-2/3 flex-col min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden absolute inset-0 lg:relative`}
        >
          {!inquiry ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                <MessageSquare className="size-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Select an inquiry</h3>
              <p className="text-gray-500 max-w-xs mx-auto">
                Click on a message from the sidebar to view the full conversation and respond.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => {
                      setShowMobileDetail(false);
                      setSelectedInquiry(null);
                    }}
                    className="lg:hidden p-1 -ml-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <ChevronLeft className="size-6 text-gray-600" />
                  </button>

                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                      {inquiry.subject}
                    </h2>
                    <div className="flex flex-col md:flex-row md:flex-wrap md:gap-4 text-xs md:text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <User className="size-3 md:size-4" />
                        {inquiry.firstName} {inquiry.lastName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3 md:size-4" />
                        {formatDateTime(inquiry.date)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase ${
                    STATUS_STYLES[inquiry.status].bg
                  } ${STATUS_STYLES[inquiry.status].text} border ${
                    STATUS_STYLES[inquiry.status].border
                  }`}
                >
                  {STATUS_STYLES[inquiry.status].icon}
                  {inquiry.status}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar">
                <div className="flex flex-col items-start max-w-[90%]">
                  <span className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">
                    Customer Message
                  </span>
                  <div className="bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm">
                    <p className="text-sm leading-relaxed">{inquiry.message}</p>
                  </div>
                </div>

                {inquiry.response && (
                  <div className="flex flex-col items-end ml-auto max-w-[90%]">
                    <span className="text-[10px] font-bold text-blue-400 uppercase mb-2 mr-1">
                      Your Response
                    </span>
                    <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md">
                      <p className="text-sm leading-relaxed">{inquiry.response}</p>
                    </div>
                    {inquiry.responseDate && (
                      <span className="text-[10px] text-gray-400 mt-2 italic">
                        Sent on {formatDateTime(inquiry.responseDate)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
                {inquiry.status === 'resolved' ? (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3 text-green-700">
                    <CheckCircle className="size-5 shrink-0" />
                    <span className="text-sm font-medium">Ticket resolved.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={response}
                      onChange={(e) => setDraftForInquiry(inquiry.id, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm"
                      placeholder={
                        inquiry.status === 'responded'
                          ? 'Write a follow-up reply...'
                          : 'Write your reply...'
                      }
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResolve(inquiry.id)}
                        disabled={isResolving || isSending}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm disabled:opacity-50"
                      >
                        <CheckCircle className="size-4" />
                        <span className="hidden sm:inline">
                          {inquiry.status === 'responded' ? 'Mark as Resolved' : 'Resolve Ticket'}
                        </span>
                        <span className="sm:hidden">Resolve</span>
                      </button>

                      <button
                        onClick={handleRespond}
                        disabled={!response.trim() || isSending || isResolving}
                        className="flex-[2] flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100 text-sm"
                      >
                        <Send className="size-4" />
                        {isSending ? 'Sending...' : 'Send Response'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}