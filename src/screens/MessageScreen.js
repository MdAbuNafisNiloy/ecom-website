// filepath: /workspaces/ecom-website/src/screens/MessageScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Avatar, 
  IconButton, 
  Divider, 
  CircularProgress, 
  InputAdornment,
  Alert,
  styled,
  Snackbar
} from '@mui/material';
import { 
  Send as SendIcon, 
  ArrowBack as ArrowBackIcon, 
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  InsertDriveFile as FileIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import pb from '../pocketbase';
import { useUser } from '../contexts/UserContext';

// Styled components for better UI experience
const MessageContainer = styled(Box)(({ theme, isUser }) => ({
  display: 'flex',
  justifyContent: isUser ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(1),
}));

const MessageBubble = styled(Box)(({ theme, isUser }) => ({
  maxWidth: '70%',
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(2),
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.grey[200],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  position: 'relative',
  wordBreak: 'break-word',
}));

const MessageTime = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  textAlign: 'right',
}));

const AttachmentPreview = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginBottom: theme.spacing(1),
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
}));

const AttachmentImage = styled('img')({
  width: '100%',
  maxHeight: 200,
  objectFit: 'contain',
});

const RemoveAttachmentButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 5,
  right: 5,
  backgroundColor: 'rgba(0,0,0,0.5)',
  color: 'white',
  padding: theme.spacing(0.5),
  '&:hover': {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
}));

const ScrollableMessageArea = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#555',
  },
}));

const MessageScreen = () => {
  const { id } = useParams(); // Seller ID
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const scrollRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!user || pb.authStore.isValid);

  // State variables
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [successSnackbar, setSuccessSnackbar] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const lastNotificationTimeRef = useRef({});

  // Initialize real-time subscription
  const [subscription, setSubscription] = useState(null);
  
  // Effect for scrolling to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check if user is logged in
  useEffect(() => {
    if (!user && !pb.authStore.isValid) {
      navigate('/login', { state: { from: location.pathname } });
    } else {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [user, navigate, location.pathname]);

  // Fetch seller info
  useEffect(() => {
    const fetchSellerInfo = async () => {
      if (!id) return;
      
      try {
        const sellerData = await pb.collection('sellers').getOne(id);
        setSeller(sellerData);
      } catch (err) {
        console.error('Error fetching seller info:', err);
        setError('Failed to load seller information.');
      }
    };

    fetchSellerInfo();
  }, [id]);

  // Setup polling for new messages every 3 seconds
  useEffect(() => {
    // Clear any existing intervals
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    if (!isAuthenticated || !id) return;

    // Set up new polling interval
    const interval = setInterval(() => {
      fetchLatestMessages();
    }, 3000); // Poll every 3 seconds
    
    setPollingInterval(interval);
    
    // Cleanup on unmount
    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, id]);

  // Fetch messages and setup real-time updates
  useEffect(() => {
    const fetchMessages = async () => {
      if (!isAuthenticated || !id) return;
      
      try {
        setLoading(true);
        
        // Fetch existing messages
        const messageRecords = await pb.collection('seller_chat').getList(1, 100, {
          filter: `seller = "${id}" && user = "${user?.id}"`,
          sort: 'created',
        });
        
        setMessages(messageRecords.items);
        setHasMore(messageRecords.totalItems > messageRecords.items.length);
        
        // Subscribe to real-time updates
        const subscription = await pb.collection('seller_chat').subscribe('*', async ({ action, record }) => {
          if (action === 'create' && record.seller === id && record.user === user?.id) {
            // Add the new message to our state
            setMessages(prevMessages => [...prevMessages, record]);
            
            // If the message is from the seller, check if we need to send a notification
            if (record.sender === 'seller') {
              checkAndSendNotification(record);
            }
          }
        });
        
        setSubscription(subscription);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Cleanup subscription when component unmounts
    return () => {
      if (subscription) {
        pb.collection('seller_chat').unsubscribe(subscription);
      }
    };
  }, [isAuthenticated, id, user]);

  // Fetch latest messages - used by the polling mechanism
  const fetchLatestMessages = async () => {
    if (!isAuthenticated || !id || !user) return;
    
    try {
      // Fetch the latest messages
      const messageRecords = await pb.collection('seller_chat').getList(1, 100, {
        filter: `seller = "${id}" && user = "${user.id}"`,
        sort: 'created',
      });
      
      // Update messages if there are any new ones
      if (messageRecords.items.length > messages.length) {
        setMessages(messageRecords.items);
        
        // Check if we need to send an email notification
        const latestMessage = messageRecords.items[messageRecords.items.length - 1];
        if (latestMessage && latestMessage.sender === 'seller') {
          checkAndSendNotification(latestMessage);
        }
      }
    } catch (err) {
      console.error('Error polling for new messages:', err);
    }
  };

  // Check and send email notification with a 30-minute gap
  const checkAndSendNotification = (newMessage) => {
    if (!user || !seller) return;
    
    const now = Date.now();
    const lastNotificationTime = lastNotificationTimeRef.current[seller.id] || 0;
    const THIRTY_MINUTES = 30 * 60 * 1000;
    
    // If it's been at least 30 minutes since the last notification
    if (now - lastNotificationTime >= THIRTY_MINUTES) {
      sendEmailNotification(newMessage);
      lastNotificationTimeRef.current[seller.id] = now; // Update the last notification time
    }
  };

  // Send email notification
  const sendEmailNotification = async (message) => {
    if (!user || !seller) return;
    
    try {
      // Create a notification record with email details
      await pb.collection('email_notifications').create({
        user_id: user.id,
        recipient_email: user.email,
        sender_name: seller.shop_name,
        subject: `New message from ${seller.shop_name}`,
        message_preview: message.message.substring(0, 100) + (message.message.length > 100 ? '...' : ''),
        message_id: message.id,
        has_attachment: message.attachment && message.attachment.length > 0,
        sent: false // Will be processed by a background service
      });

      console.log('Email notification queued for sending');
    } catch (err) {
      console.error('Error creating email notification:', err);
    }
  };

  // Handle sending a message
  const sendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !user || !seller) return;
    
    try {
      setSending(true);
      
      // Create form data for file uploads
      const formData = new FormData();
      
      // Add message text and metadata
      formData.append('message', message);
      formData.append('seller', seller.id);
      formData.append('user', user.id);
      formData.append('sender', 'user');
      
      // Preview URLs for instant display in UI
      const previewAttachments = attachments.map(file => ({
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        type: file.type
      }));

      // Add attachments if any
      attachments.forEach(file => {
        formData.append('attachment', file);
      });
      
      // First, optimistically add the message to the UI
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        message: message,
        seller: seller.id,
        user: user.id,
        sender: 'user',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        attachment_preview: previewAttachments,
        isOptimistic: true
      };
      
      setMessages(prevMessages => [...prevMessages, optimisticMessage]);
      
      // Send message using PocketBase
      const createdMessage = await pb.collection('seller_chat').create(formData);
      
      // Replace the optimistic message with the real one
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === optimisticMessage.id ? createdMessage : msg
        )
      );
      
      // Show success notification
      setSuccessSnackbar(true);
      
      // Clear input and attachments
      setMessage('');
      setAttachments([]);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      
      // Remove the optimistic message on failure
      setMessages(prevMessages => 
        prevMessages.filter(msg => !msg.isOptimistic)
      );
    } finally {
      setSending(false);
    }
  };

  // Handle file attachment
  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files].slice(0, 5)); // Limit to 5 attachments
    }
    // Reset the input value to allow selecting the same file again
    e.target.value = null;
  };

  // Remove an attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format date for message groups
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Determine if we need to show a date separator
  const showDateSeparator = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.created).toDateString();
    const prevDate = new Date(prevMsg.created).toDateString();
    
    return currentDate !== prevDate;
  };

  // Get file type icon
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return <ImageIcon />;
    } else if (['pdf', 'doc', 'docx'].includes(extension)) {
      return <DescriptionIcon />;
    } else {
      return <FileIcon />;
    }
  };

  // Render attachment in message
  const renderAttachment = (attachment, record) => {
    // Handle optimistic UI for attachments
    if (record.isOptimistic && record.attachment_preview) {
      const preview = record.attachment_preview.find(a => a.name === attachment.name || a.previewUrl === attachment);
      
      if (preview) {
        if (preview.type.startsWith('image/')) {
          return (
            <Box sx={{ mb: 1 }} key={preview.name}>
              <img 
                src={preview.previewUrl} 
                alt="attachment" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: 200, 
                  borderRadius: 8
                }}
              />
            </Box>
          );
        } else {
          return (
            <Button
              key={preview.name}
              variant="outlined"
              startIcon={getFileIcon(preview.name)}
              sx={{ mb: 1, textTransform: 'none' }}
            >
              {preview.name.length > 20 ? `${preview.name.substring(0, 20)}...` : preview.name}
            </Button>
          );
        }
      }
      return null;
    }

    // Handle regular attachments from server
    const fileUrl = pb.files.getUrl(record, attachment);
    const extension = attachment.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return (
        <Box sx={{ mb: 1 }} key={attachment}>
          <img 
            src={fileUrl} 
            alt="attachment" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: 200, 
              borderRadius: 8,
              cursor: 'pointer'
            }}
            onClick={() => window.open(fileUrl, '_blank')}
          />
        </Box>
      );
    } else {
      return (
        <Button
          key={attachment}
          variant="outlined"
          startIcon={getFileIcon(attachment)}
          sx={{ mb: 1, textTransform: 'none' }}
          onClick={() => window.open(fileUrl, '_blank')}
        >
          {attachment.length > 20 ? `${attachment.substring(0, 20)}...` : attachment}
        </Button>
      );
    }
  };

  // Mark seller messages as read when viewed
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!isAuthenticated || !id || !user || loading) return;
      
      try {
        // Find unread seller messages
        const unreadMessages = messages.filter(msg => 
          msg.sender === 'seller' && !msg.read_status && !msg.isOptimistic
        );
        
        if (unreadMessages.length === 0) return;
        
        // Update messages in state first for immediate UI feedback
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            (msg.sender === 'seller' && !msg.read_status) 
              ? {...msg, read_status: true} 
              : msg
          )
        );
        
        // Then update in database
        await Promise.all(
          unreadMessages.map(msg => 
            pb.collection('seller_chat').update(msg.id, { read_status: true })
          )
        );
        
        console.log(`Marked ${unreadMessages.length} messages as read`);
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    };
    
    // Call immediately when messages are loaded or when new messages arrive
    markMessagesAsRead();
  }, [isAuthenticated, id, user, messages]);

  // Loading and authentication handling
  if (isLoading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton edge="start" onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          
          {seller ? (
            <>
              <Avatar 
                src={seller.shop_logo ? pb.files.getUrl(seller, seller.shop_logo) : undefined}
                alt={seller.shop_name}
                sx={{ mr: 2 }}
              >
                {!seller.shop_logo && seller.shop_name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {seller.shop_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {seller.admin_verified ? 'Verified Seller' : 'Seller'}
                </Typography>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography>Loading seller details...</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Error message if any */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Messages area */}
      <ScrollableMessageArea ref={scrollRef}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: 'text.secondary'
          }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              No messages yet
            </Typography>
            <Typography variant="body2">
              Start your conversation with {seller?.shop_name}
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((msg, index) => (
              <React.Fragment key={msg.id || `temp-${index}`}>
                {/* Date separator */}
                {showDateSeparator(msg, messages[index - 1]) && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <Typography variant="caption" sx={{ 
                      backgroundColor: 'background.paper', 
                      px: 2, 
                      py: 0.5, 
                      borderRadius: 4,
                      color: 'text.secondary',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                      {formatDate(msg.created)}
                    </Typography>
                  </Box>
                )}
                
                {/* Message */}
                <MessageContainer isUser={msg.sender === 'user'}>
                  <MessageBubble isUser={msg.sender === 'user'}>
                    {/* Attachments */}
                    {msg.isOptimistic && msg.attachment_preview ? 
                      msg.attachment_preview.map(attachment => renderAttachment(attachment, msg)) : 
                      msg.attachment && msg.attachment.map(attachment => renderAttachment(attachment, msg))
                    }
                    
                    {/* Message text */}
                    {msg.message && (
                      <Typography variant="body1">
                        {msg.message}
                      </Typography>
                    )}
                    
                    {/* Timestamp */}
                    <MessageTime>
                      {formatTime(msg.created)}
                      {msg.isOptimistic && (
                        <CircularProgress size={8} sx={{ ml: 1 }} />
                      )}
                    </MessageTime>
                  </MessageBubble>
                </MessageContainer>
              </React.Fragment>
            ))}
          </>
        )}
      </ScrollableMessageArea>

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <Box sx={{ p: 2, backgroundColor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {attachments.map((file, index) => (
              <AttachmentPreview key={index}>
                {file.type.startsWith('image/') ? (
                  <AttachmentImage
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index}`}
                  />
                ) : (
                  <Box sx={{ 
                    p: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    backgroundColor: '#f5f5f5'
                  }}>
                    {getFileIcon(file.name)}
                    <Typography variant="body2" sx={{ ml: 1, maxWidth: 150 }} noWrap>
                      {file.name}
                    </Typography>
                  </Box>
                )}
                <RemoveAttachmentButton size="small" onClick={() => removeAttachment(index)}>
                  <CloseIcon fontSize="small" />
                </RemoveAttachmentButton>
              </AttachmentPreview>
            ))}
          </Box>
        </Box>
      )}

      {/* Message input */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mt: 'auto', 
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <IconButton 
          color="primary" 
          onClick={() => fileInputRef.current?.click()}
          disabled={attachments.length >= 5 || sending}
        >
          <AttachFileIcon />
        </IconButton>
        
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileAttachment}
          style={{ display: 'none' }}
          accept="image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
        
        <TextField
          fullWidth
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={sending}
          multiline
          maxRows={4}
          InputProps={{
            sx: { borderRadius: 4 },
          }}
        />
        
        <Button
          variant="contained"
          color="primary"
          endIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          onClick={sendMessage}
          disabled={(!message.trim() && attachments.length === 0) || sending}
          sx={{ 
            borderRadius: 4,
            minWidth: 100,
            textTransform: 'none'
          }}
        >
          Send
        </Button>
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={successSnackbar}
        autoHideDuration={3000}
        onClose={() => setSuccessSnackbar(false)}
        message="Message sent successfully"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{
          sx: {
            backgroundColor: 'success.main',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }
        }}
        action={<CheckIcon />}
      />
    </Box>
  );
};

export default MessageScreen;