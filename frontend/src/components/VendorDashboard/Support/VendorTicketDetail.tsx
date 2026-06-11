'use client';

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, User, CheckCircle, Clock, AlertCircle, MessageSquare, Tag, Calendar, Shield } from "lucide-react";
import Link from "next/link";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import supportService, { SupportTicket, TicketMessage } from "@/services/supportService";

export default function VendorTicketDetail({ ticketId }: { ticketId: string }) {
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [replyMessage, setReplyMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTicket();
    }, [ticketId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchTicket = async () => {
        try {
            setIsLoading(true);
            const res = await supportService.getTicketById(ticketId);
            if (res.success && res.data) {
                setTicket(res.data);
                setMessages(res.data.messages || []);
            }
        } catch (error) {
            showErrorToast("Error", "Failed to load ticket details");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await supportService.replyToTicket(ticketId, { message: replyMessage });
            if (res.success) {
                showSuccessToast("Reply Sent", "Your response has been sent to our support team.");
                setReplyMessage("");
                fetchTicket();
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to send reply.";
            showErrorToast("Failed", msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseTicket = async () => {
        try {
            const res = await supportService.updateTicketStatus(ticketId, "resolved");
            if (res.success) {
                showSuccessToast("Status Updated", "Ticket marked as resolved");
                fetchTicket();
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to update status.";
            showErrorToast("Failed", msg);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
                <span className="ml-3 text-slate-600">Loading ticket...</span>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Ticket not found</p>
                <Link href="/vendor/dashboard/support" className="mt-4 text-sm text-blue-600 hover:underline">
                    Back to Support
                </Link>
            </div>
        );
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "open": return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: <AlertCircle className="h-3.5 w-3.5" />, label: "Open" };
            case "in-progress": return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: <Clock className="h-3.5 w-3.5" />, label: "In Progress" };
            case "resolved": return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: <CheckCircle className="h-3.5 w-3.5" />, label: "Resolved" };
            case "closed": return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", icon: <Shield className="h-3.5 w-3.5" />, label: "Closed" };
            default: return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", icon: null, label: status };
        }
    };

    const getPriorityConfig = (priority: string) => {
        switch (priority) {
            case "urgent": return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Urgent" };
            case "high": return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "High" };
            case "medium": return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Medium" };
            case "low": return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "Low" };
            default: return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", label: priority };
        }
    };

    const statusCfg = getStatusConfig(ticket.status);
    const priorityCfg = getPriorityConfig(ticket.priority);
    const isOpen = ticket.status !== "closed" && ticket.status !== "resolved";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Link
                        href="/vendor/dashboard/support"
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors self-start"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-slate-900 truncate">{ticket.subject}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {ticket.ticketId}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                {statusCfg.icon}
                                {statusCfg.label}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityCfg.bg} ${priorityCfg.text} ${priorityCfg.border}`}>
                                {priorityCfg.label}
                            </span>
                        </div>
                    </div>
                    {isOpen && (
                        <button
                            onClick={handleCloseTicket}
                            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium shrink-0"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Mark as Resolved
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Conversation */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-slate-500" />
                                Conversation
                                {messages.length > 0 && (
                                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                        {messages.length}
                                    </span>
                                )}
                            </h2>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            {messages.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageSquare className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-sm text-slate-400">No messages yet. Start the conversation below.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((message) => {
                                        const isVendor = message.senderType === "vendor";
                                        return (
                                            <div key={message.id} className={`flex ${isVendor ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[80%] rounded-xl p-4 ${
                                                    isVendor
                                                        ? "bg-brand-500 text-white"
                                                        : "bg-slate-100 text-slate-900"
                                                }`}>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                            isVendor ? "bg-white/20 text-white" : "bg-slate-300 text-slate-700"
                                                        }`}>
                                                            {isVendor ? "Y" : "S"}
                                                        </div>
                                                        <span className="text-xs font-semibold">
                                                            {message.senderName || (isVendor ? "You" : "Support Team")}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm leading-relaxed">{message.message}</p>
                                                    <p className={`text-xs mt-2 ${isVendor ? "text-slate-400" : "text-slate-500"}`}>
                                                        {new Date(message.createdAt).toLocaleString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Reply Form — inline at bottom of conversation */}
                        {isOpen && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                <form onSubmit={handleSubmitReply}>
                                    <textarea
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        placeholder="Type your reply..."
                                        rows={3}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent resize-none text-sm bg-white"
                                        required
                                    />
                                    <div className="flex justify-end mt-3">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !replyMessage.trim()}
                                            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-medium py-2 px-5 rounded-lg transition-colors text-sm"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            {isSubmitting ? "Sending..." : "Send Reply"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Resolved/Closed state */}
                        {!isOpen && (
                            <div className="p-4 border-t border-slate-100 bg-green-50 text-center">
                                <p className="text-sm text-green-700 font-medium flex items-center justify-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    This ticket has been {ticket.status}. No further replies can be sent.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Ticket Info */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <Tag className="h-4 w-4 text-slate-500" />
                                Ticket Details
                            </h2>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</p>
                                <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                    {statusCfg.icon}
                                    {statusCfg.label}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Priority</p>
                                <span className={`inline-flex items-center mt-1 px-2.5 py-1 rounded-full text-xs font-medium border ${priorityCfg.bg} ${priorityCfg.text} ${priorityCfg.border}`}>
                                    {priorityCfg.label}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Category</p>
                                <p className="text-sm text-slate-900 mt-1 capitalize">{ticket.category}</p>
                            </div>
                            <div className="pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Created {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    Updated {new Date(ticket.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                        <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2">Tips</h3>
                        <ul className="space-y-1.5 text-xs text-blue-700">
                            <li>Be specific about your issue for faster resolution.</li>
                            <li>Include order IDs or screenshots if relevant.</li>
                            <li>Our team typically responds within 24 hours.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
