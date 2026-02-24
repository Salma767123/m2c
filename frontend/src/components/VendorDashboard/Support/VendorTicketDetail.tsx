'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Send, Clock, User, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/UI/Card";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import supportService, { SupportTicket, TicketMessage } from "@/services/supportService";

export default function VendorTicketDetail({ ticketId }: { ticketId: string }) {
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [replyMessage, setReplyMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchTicket();
    }, [ticketId]);

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
                fetchTicket(); // Refresh to fetch new message
            }
        } catch (error: any) {
            showErrorToast("Failed", error.message || "Failed to send reply. Please try again.");
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
        } catch (error: any) {
            showErrorToast("Failed", error.message || "Failed to update status.");
        }
    };

    if (isLoading) {
        return <div className="p-6 text-center text-gray-500">Loading ticket details...</div>;
    }

    if (!ticket) {
        return <div className="p-6 text-center text-red-500">Ticket not found.</div>;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "open": return "bg-red-100 text-red-800";
            case "in-progress": return "bg-blue-100 text-blue-800";
            case "resolved": return "bg-green-100 text-green-800";
            case "closed": return "bg-gray-100 text-gray-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent": return "bg-red-100 text-red-800";
            case "high": return "bg-orange-100 text-orange-800";
            case "medium": return "bg-yellow-100 text-yellow-800";
            case "low": return "bg-green-100 text-green-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/vendor/dashboard/support" className="text-blue-600 hover:text-blue-700">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
                    <p className="text-gray-600 mt-1">Ticket ID: {ticket.ticketId}</p>
                </div>
                {ticket.status !== "closed" && ticket.status !== "resolved" && (
                    <button
                        onClick={handleCloseTicket}
                        className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Resolved
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (Conversation & Reply) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Conversation */}
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
                            <div className="space-y-4">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4">No responses yet.</div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.senderType === "vendor" ? "justify-end" : "justify-start"
                                                }`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-lg p-4 ${message.senderType === "vendor"
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-100 text-gray-900"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <User className="w-4 h-4" />
                                                    <span className="text-sm font-semibold">{message.senderName || (message.senderType === "admin" ? "Support Team" : "You")}</span>
                                                </div>
                                                <p className="text-sm">{message.message}</p>
                                                <p
                                                    className={`text-xs mt-2 ${message.senderType === "vendor" ? "text-blue-100" : "text-gray-500"
                                                        }`}
                                                >
                                                    {new Date(message.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reply Form */}
                    {ticket.status !== "closed" && ticket.status !== "resolved" && (
                        <Card>
                            <CardContent className="p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Reply</h2>
                                <form onSubmit={handleSubmitReply} className="space-y-4">
                                    <textarea
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        placeholder="Type your response..."
                                        rows={5}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !replyMessage.trim()}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                                        >
                                            <Send className="w-4 h-4" />
                                            {isSubmitting ? "Sending..." : "Send Reply"}
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Information</h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                        {ticket.status.replace("-", " ").toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Priority:</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Category:</span>
                                    <span className="text-sm font-medium text-gray-900">{ticket.category}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Created:</span>
                                    <span className="text-sm text-gray-900">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Last Updated:</span>
                                    <span className="text-sm text-gray-900">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
