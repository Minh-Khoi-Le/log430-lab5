/**
 * History Page
 * 
 * This component displays the purchase and refund history for a client user.
 * It shows all past purchases with details like date, store, products, and total.
 * 
 */

import React, { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import {
  Box,
  Paper,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Container,
  Stack,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  TextField,
  Tab,
  Tabs
} from "@mui/material";
import StoreIcon from "@mui/icons-material/Store";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import RefundIcon from '@mui/icons-material/AssignmentReturn';
import UndoIcon from '@mui/icons-material/Replay';
import SellIcon from '@mui/icons-material/Sell';

const History = () => {
  const { user } = useUser();
  const [purchases, setPurchases] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // default to most recent first
  const [currentTab, setCurrentTab] = useState(0); // 0 = purchases, 1 = refunds
  
  // Refund state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundingSale, setRefundingSale] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Format date for display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle sort order change
  const handleSortChange = (event, newSortOrder) => {
    if (newSortOrder !== null) {
      setSortOrder(newSortOrder);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Sort items by date
  const sortedPurchases = [...purchases]
    .filter(p => p.status === 'active') // Show only active sales in purchases tab
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  
  const sortedRefunds = [...refunds].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  // Open refund confirmation dialog
  const handleRefundRequest = (purchase) => {
    setRefundingSale(purchase);
    setRefundReason("");
    setRefundDialogOpen(true);
  };

  // Close refund dialog
  const handleCloseRefundDialog = () => {
    setRefundDialogOpen(false);
    setRefundingSale(null);
  };

  // Process refund
  const handleConfirmRefund = async () => {
    if (!refundingSale) return;
    
    setRefundLoading(true);
    
    try {
      const response = await fetch("http://localhost:3000/api/v1/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: refundingSale.id,
          userId: user.id,
          reason: refundReason || "Client requested refund"
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error while processing refund");
      }
      
      // Refresh both purchase and refund data
      fetchHistory();
      
      setSnackbarMessage("Refund processed successfully");
      handleCloseRefundDialog();
      
      // Switch to refunds tab to show the new refund
      setCurrentTab(1);
    } catch (err) {
      console.error("Refund error:", err);
      setSnackbarMessage(`Erreur: ${err.message}`);
    } finally {
      setRefundLoading(false);
    }
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbarMessage("");
  };

  // Fetch purchase and refund history
  const fetchHistory = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError("");
    
    try {
      // Fetch purchase history
      const purchasesResponse = await fetch("http://localhost:3000/api/v1/sales/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!purchasesResponse.ok) {
        throw new Error("Error loading history");
      }
      
      const purchasesData = await purchasesResponse.json();
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      
      // Fetch refund history
      const refundsResponse = await fetch("http://localhost:3000/api/v1/refunds/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!refundsResponse.ok) {
        throw new Error("Error loading refunds");
      }
      
      const refundsData = await refundsResponse.json();
      setRefunds(Array.isArray(refundsData) ? refundsData : []);
      
    } catch (err) {
      console.error("Error fetching history:", err);
      setError("Unable to load your history");
    } finally {
      setLoading(false);
    }
  };

  // Fetch history on mount and when user changes
  useEffect(() => {
    fetchHistory();
  }, [user]);

  return (
    <Box sx={{ py: 4, bgcolor: "#f6f6f6", minHeight: "calc(100vh - 60px)" }}>
      <Container maxWidth="md">
        {/* Header */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: { xs: 2, md: 0 } }}>
              History
            </Typography>
            
            {/* Sort controls */}
            {(purchases.length > 0 || refunds.length > 0) && !loading && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Sort by date:
                </Typography>
                <ToggleButtonGroup
                  value={sortOrder}
                  exclusive
                  onChange={handleSortChange}
                  size="small"
                  aria-label="Ordre de tri"
                >
                  <ToggleButton value="desc" aria-label="Plus récent d'abord">
                    <KeyboardArrowDownIcon fontSize="small" />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      Most recent
                    </Typography>
                  </ToggleButton>
                  <ToggleButton value="asc" aria-label="Plus ancien d'abord">
                    <KeyboardArrowUpIcon fontSize="small" />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      Oldest
                    </Typography>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}
          </Box>
          
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              aria-label="history tabs"
            >
              <Tab 
                icon={<SellIcon />} 
                iconPosition="start" 
                label={`Purchases (${purchases.filter(p => p.status === 'active').length})`} 
              />
              <Tab 
                icon={<UndoIcon />} 
                iconPosition="start" 
                label={`Refunds (${refunds.length})`} 
              />
            </Tabs>
          </Box>
        </Paper>

        {/* Loading indicator */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Purchases tab */}
        {currentTab === 0 && (
          <>
            {!loading && !error && sortedPurchases.length === 0 && (
              <Alert severity="info" sx={{ mb: 3 }}>
                You haven't made any purchases yet.
              </Alert>
            )}
            
            <Stack spacing={2}>
              {sortedPurchases.map((purchase) => (
                <Paper 
                  elevation={2} 
                  key={purchase.id} 
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4
                    }
                  }}
                >
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: '#f8f9fa', 
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                      Order #{purchase.id}
                    </Typography>
                    <Chip 
                      label={`Total: $${purchase.total.toFixed(2)}`}
                      color="primary"
                      icon={<ReceiptIcon />}
                    />
                  </Box>
                  
                  <Box sx={{ px: 2, py: 1, display: "flex", gap: 3, bgcolor: '#f8f9fa', flexWrap: 'wrap' }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <CalendarTodayIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(purchase.date)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <StoreIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {purchase.store.name}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider />
                  
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Purchased items:
                    </Typography>
                    <List disablePadding>
                      {purchase.lines.map((line) => (
                        <ListItem 
                          key={line.id} 
                          disablePadding 
                          sx={{ 
                            py: 1,
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                            '&:last-child': { borderBottom: 'none' }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {line.product.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {(line.quantity * line.unitPrice).toFixed(2)} €
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {line.quantity} x {line.unitPrice.toFixed(2)} €
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                    
                    {/* Refund Button */}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<RefundIcon />}
                        onClick={() => handleRefundRequest(purchase)}
                        size="small"
                      >
                        Request refund
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </>
        )}

        {/* Refunds tab */}
        {currentTab === 1 && (
          <>
            {!loading && !error && sortedRefunds.length === 0 && (
              <Alert severity="info" sx={{ mb: 3 }}>
                You haven't made any refund requests yet.
              </Alert>
            )}
            
            <Stack spacing={2}>
              {sortedRefunds.map((refund) => (
                <Paper 
                  elevation={2} 
                  key={refund.id} 
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4
                    },
                    border: '1px solid rgba(76, 175, 80, 0.3)',
                  }}
                >
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(76, 175, 80, 0.1)', 
                    borderBottom: '1px solid rgba(76, 175, 80, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 500 }}>
                        Refund #{refund.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        For order #{refund.sale.id}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`Amount: $${refund.total.toFixed(2)}`}
                      color="success"
                      icon={<RefundIcon />}
                    />
                  </Box>
                  
                  <Box sx={{ px: 2, py: 1, display: "flex", gap: 3, bgcolor: 'rgba(76, 175, 80, 0.05)', flexWrap: 'wrap' }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <CalendarTodayIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(refund.date)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <StoreIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {refund.store.name}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {refund.reason && (
                    <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(76, 175, 80, 0.05)' }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Reason:</strong> {refund.reason}
                      </Typography>
                    </Box>
                  )}
                  
                  <Divider />
                  
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Refunded items:
                    </Typography>
                    <List disablePadding>
                      {(refund.lines || []).map((line) => (
                        <ListItem 
                          key={line.id} 
                          disablePadding 
                          sx={{ 
                            py: 1,
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                            '&:last-child': { borderBottom: 'none' }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {line.product.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {(line.quantity * line.unitPrice).toFixed(2)} €
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {line.quantity} x {line.unitPrice.toFixed(2)} €
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </>
        )}
        
        {/* Refund Confirmation Dialog */}
        <Dialog
          open={refundDialogOpen}
          onClose={!refundLoading ? handleCloseRefundDialog : undefined}
        >
          <DialogTitle>Confirm refund</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to request a refund for this order?
              {refundingSale && (
                <>
                  <br /><br />
                  <strong>Commande #{refundingSale.id}</strong><br />
                  Date: {refundingSale ? formatDate(refundingSale.date) : ''}<br />
                  Total: ${refundingSale?.total.toFixed(2)}<br />
                </>
              )}
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="reason"
              label="Reason for refund (optional)"
              fullWidth
              variant="outlined"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              disabled={refundLoading}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleCloseRefundDialog}
              disabled={refundLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmRefund}
              color="error"
              autoFocus
              disabled={refundLoading}
              variant="contained"
            >
              {refundLoading ? <CircularProgress size={24} /> : "Confirm refund"}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Success/Error Snackbar */}
        <Snackbar
          open={!!snackbarMessage}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          message={snackbarMessage}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Container>
    </Box>
  );
};

export default History; 