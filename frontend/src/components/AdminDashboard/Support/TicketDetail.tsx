"use client";

import { useState } from "react";
import { ArrowLeft, Send, Clock, CheckCircle, User } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import Dropdown from "../../UI/Dropdown";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";

interface TicketMessage {
  id: string;
  sender: "vendor" | "admin";
  senderName: string;
  message: string;
  timestamp: string;
}

export default function TicketDetail({ ticketId }: { ticketId: string }) {
  const [replyMessage, setReplyMessage] = useState("");
  const [ticketStatus, setTicketStatus] = useState("in-progress");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data - replace with actual API call
  const ticket = {
    id: ticketId,
    ticketId: "TKT-2024-001",
    vendorName: "Textile Co.",
    vendorEmail: "vendor@textile.com",
    subject: "Payment not received for order #12345",
    description: "I completed an order but haven't received payment yet. The order was delivered 5 days ago.",
    status: "in-progress",
    priority: "high",
    category: "Payment",
    createdAt: "2024-02-08T10:30:00",
    updatedAt: "2024-02-08T14:20:00",
  };

  const messages: TicketMessage[] = [
    {
      id: "1",
      sender: "vendor",
      senderName: "Textile Co.",
      message: "I completed an order but haven't received payment yet. The order was delivered 5 days ago.",
      timestamp: "2024-02-08T10:30:00",
    },
    {
      id: "2",
      sender: "admin",
      senderName: "Admin Support",
      message: "Thank you for reaching out. We're looking into your payment issue. Can you please provide the order number?",
      timestamp: "2024-02-08T11:15:00",
    },
    {
      id: "3",
      sender: "vendor",
      senderName: "Textile Co.",
      message: "The order number is #12345. It was delivered on February 3rd, 2024.",
      timestamp: "2024-02-08T14:20:00",
    },
  ];

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      showSuccessToast("Reply Sent", "Your response has been sent to the vendor.");
      setReplyMessage("");
    } catch (error) {
      showErrorToast("Failed", "Failed to send reply. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string | string[]) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTicketStatus(newStatus as string);
      showSuccessToast("Status Updated", `Ticket status changed to ${newStatus}`);
    } catch (error) {
      showErrorToast("Failed", "Failed to update status.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-420 mx-auto space-y-6">
      <Breadcrumb />
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard/support" className="text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
          <p className="text-gray-600 mt-1">Ticket ID: {ticket.ticketId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
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
                  <span className="text-sm text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Updated:</span>
                  <span className="text-sm text-gray-900">{new Date(ticket.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.sender === "admin"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-semibold">{message.senderName}</span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                      <p
                        className={`text-xs mt-2 ${
                          message.sender === "admin" ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reply Form */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Reply</h2>
              <form onSubmit={handleSubmitReply} className="space-y-4">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response to the vendor..."
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="font-medium text-gray-900">{ticket.vendorName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <p className="font-medium text-gray-900">{ticket.vendorEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Status */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
              <Dropdown
                value={ticketStatus}
                options={[
                  { value: "open", label: "Open" },
                  { value: "in-progress", label: "In Progress" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                ]}
                onChange={handleStatusChange}
                placeholder="Select status"
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <CheckCircle className="w-4 h-4" />
                  Mark as Resolved
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  <Clock className="w-4 h-4" />
                  Request More Info
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
