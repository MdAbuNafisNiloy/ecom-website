import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Avatar, 
  IconButton, 
  CircularProgress, 
  InputAdornment,
  Alert,
  styled,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { 
  Send as SendIcon, 
  ArrowBack as ArrowBackIcon, 
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  InsertDriveFile as FileIcon,
  Check as CheckIcon,
  SupportAgent as SupportAgentIcon
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

const UnseenIndicator = styled(Box)(({ theme }) => ({
  width: 12,
  height: 12,
  backgroundColor: theme.palette.primary.main,
  borderRadius: '50%',
  marginRight: theme.spacing(1),
  display: 'inline-block',
}));

const SupportChatScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const scrollRef = useRef(null);
  const [anonymousId, setAnonymousId] = useState('');
  const [showAnonymousDialog, setShowAnonymousDialog] = useState(false);
  const [anonymousEmail, setAnonymousEmail] = useState('');
  const [anonymousName, setAnonymousName] = useState('');
  
  // State variables
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [successSnackbar, setSuccessSnackbar] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Effect for scrolling to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Generate a random anonymous ID for non-logged-in users
  useEffect(() => {
    // If user is logged in, we don't need an anonymous ID
    if (user) {
      setShowAnonymousDialog(false); // Ensure dialog doesn't show for logged-in users
      return;
    }
    
    // Check if we already have an anonymousId in localStorage
    const storedId = localStorage.getItem('anonymousSupportId');
    if (storedId) {
      setAnonymousId(storedId);
      setShowAnonymousDialog(false); // Don't show dialog if we already have an ID
    } else {
      // If not, show the anonymous warning dialog
      setShowAnonymousDialog(true);
    }
  }, [user]);

  // Handle anonymous user dialog submit
  const handleAnonymousSubmit = () => {
    const newId = 'anon-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    setAnonymousId(newId);
    localStorage.setItem('anonymousSupportId', newId);
    
    // Store optional contact info if provided
    if (anonymousName) localStorage.setItem('anonymousSupportName', anonymousName);
    if (anonymousEmail) localStorage.setItem('anonymousSupportEmail', anonymousEmail);
    
    setShowAnonymousDialog(false);
  };

  // Setup polling for new messages every 5 seconds
  useEffect(() => {
    // Clear any existing intervals
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Don't set up polling until we have a user or anonymous ID
    if (!user && !anonymousId) return;

    // Set up new polling interval
    const interval = setInterval(() => {
      fetchMessages();
    }, 5000); // Poll every 5 seconds
    
    setPollingInterval(interval);
    
    // Cleanup on unmount
    return () => {
      clearInterval(interval);
    };
  }, [user, anonymousId]);

  // Fetch messages
  const fetchMessages = async () => {
    // Don't fetch if we don't have a user or anonymous ID yet
    if (!user && !anonymousId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Construct filter based on whether user is logged in or anonymous
      let filter;
      if (user) {
        // Fix: replace IN operator with OR condition
        filter = `user = "${user.id}" && (sender = "user" || sender = "admin")`;
        console.log('Using authenticated user filter:', filter);
      } else {
        // Fix: replace IN operator with OR condition
        filter = `user = "${anonymousId}" && (sender = "user" || sender = "admin")`;
        console.log('Using anonymous user filter:', filter);
      }

      console.log('Fetching messages with filter:', filter);
      
      // Fetch existing messages with improved error handling
      try {
        const messageRecords = await pb.collection('admin_chat').getList(1, 100, {
          filter: filter,
          sort: 'created',
        });
        
        console.log('Fetched messages:', messageRecords.items.length);
        setMessages(messageRecords.items);
        setHasMore(messageRecords.totalItems > messageRecords.items.length);
        
        // Count unseen messages from admin
        const unseenCount = messageRecords.items.filter(
          msg => msg.sender === 'admin' && !msg.seen
        ).length;
        setUnreadCount(unseenCount);
        
        setError(null); // Clear any previous errors
        
        // Mark admin messages as seen when they are retrieved
        markMessagesAsSeen(messageRecords.items);
      } catch (apiError) {
        console.error('API Error details:', apiError);
        if (apiError.status === 403) {
          setError('Permission denied. You may not have access to this collection.');
        } else if (apiError.status === 404) {
          setError('Support chat system is currently unavailable.');
        } else if (apiError.data && apiError.data.message) {
          setError(`Error: ${apiError.data.message}`);
        } else {
          setError('Failed to load messages. Please try again.');
        }
      }
    } catch (err) {
      console.error('General error in fetchMessages:', err);
      setError('Error connecting to the support system. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Add a function to mark messages as seen
  const markMessagesAsSeen = async (messages) => {
    // Find unseen admin messages
    const unseenMessages = messages.filter(
      msg => msg.sender === 'admin' && !msg.seen
    );
    
    if (unseenMessages.length === 0) return;
    
    try {
      // Update messages in batch
      const updatePromises = unseenMessages.map(msg => 
        pb.collection('admin_chat').update(msg.id, { seen: true })
      );
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      console.log(`Marked ${unseenMessages.length} messages as seen`);
    } catch (err) {
      console.error('Error marking messages as seen:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    // Only fetch if we have user or anonymousId
    if (user || anonymousId) {
      fetchMessages();
    }
  }, [user, anonymousId]);

  // Handle sending a message
  const sendMessage = async () => {
    if ((!message.trim() && attachments.length === 0)) return;
    
    // Don't send if we don't have a user or anonymous ID
    if (!user && !anonymousId) {
      setError('Session information missing. Please refresh the page.');
      return;
    }
    
    try {
      setSending(true);
      
      // Create form data for file uploads
      const formData = new FormData();
      
      // Add message text and metadata
      formData.append('message', message);
      formData.append('sender', 'user');
      formData.append('seen', true); // Admin messages are "seen" by default when sent by user
      
      // Add user ID - either logged in user or anonymous
      if (user) {
        formData.append('user', user.id);
      } else {
        formData.append('user', anonymousId);
        // If anonymous user provided contact info, include it in the message
        if (localStorage.getItem('anonymousSupportName') || localStorage.getItem('anonymousSupportEmail')) {
          const anonymousName = localStorage.getItem('anonymousSupportName') || '';
          const anonymousEmail = localStorage.getItem('anonymousSupportEmail') || '';
          const contactInfo = `Anonymous user contact: ${anonymousName || 'Not provided'} / ${anonymousEmail || 'No email'}`;
          formData.append('contact_info', contactInfo);
        }
      }
      
      // Preview URLs for instant display in UI
      const previewAttachments = attachments.map(file => ({
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        type: file.type
      }));

      // Add attachments if any
      attachments.forEach(file => {
        formData.append('image', file);
      });
      
      // First, optimistically add the message to the UI
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        message: message,
        user: user ? user.id : anonymousId,
        sender: 'user',
        seen: true, // User's messages are always "seen"
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        attachment_preview: previewAttachments,
        isOptimistic: true
      };
      
      setMessages(prevMessages => [...prevMessages, optimisticMessage]);
      
      // Send message using PocketBase
      const createdMessage = await pb.collection('admin_chat').create(formData);
      
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

  // Show anonymous ID warning if user has been using anonymous chat
  const showLoginPrompt = () => {
    if (!user && localStorage.getItem('anonymousSupportId')) {
      return (
        <Alert severity="info" sx={{ m: 2 }}>
          You're chatting as an anonymous user. <Button size="small" onClick={() => navigate('/login')}>Log in</Button> to keep your chat history.
        </Alert>
      );
    }
    return null;
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton edge="start" onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          
          <Avatar 
            sx={{ 
              mr: 2, 
              bgcolor: 'primary.main',
              color: 'primary.contrastText'
            }}
          >
            <SupportAgentIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Customer Support
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We typically reply within 24 hours
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Anonymous user dialog */}
      <Dialog open={showAnonymousDialog} onClose={() => setShowAnonymousDialog(false)}>
        <DialogTitle>Anonymous Support Chat</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You're currently using support chat in anonymous mode. Please note:
          </DialogContentText>
          <Box sx={{ mt: 2, mb: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Your chat history will not be saved after you leave this page or close your browser.
            </Alert>
            <Typography variant="body2" gutterBottom>
              • Messages may be lost when session expires
            </Typography>
            <Typography variant="body2" gutterBottom>
              • You won't receive email notifications about replies
            </Typography>
            <Typography variant="body2" gutterBottom>
              • Your conversation won't be linked to your account
            </Typography>
          </Box>
          <DialogContentText sx={{ mt: 2 }}>
            For the best support experience, we recommend <Button size="small" color="primary" onClick={() => navigate('/login')}>logging in</Button>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={() => handleAnonymousSubmit()}>
            Continue as Anonymous
          </Button>
        </DialogActions>
      </Dialog>

      {/* Login prompt for anonymous users */}
      {showLoginPrompt()}

      {/* Error message if any */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Messages area */}
      <ScrollableMessageArea ref={scrollRef}>
        {loading && messages.length === 0 ? (
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
              Start your conversation with our support team
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
                    {/* Unseen indicator for admin messages */}
                    {msg.sender === 'admin' && msg.seen === false && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 0.5,
                        color: 'primary.main',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        <UnseenIndicator />
                        New message
                      </Box>
                    )}
                    
                    {/* Attachments */}
                    {msg.isOptimistic && msg.attachment_preview ? 
                      msg.attachment_preview.map(attachment => renderAttachment(attachment, msg)) : 
                      msg.image && msg.image.map(attachment => renderAttachment(attachment, msg))
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
          disabled={sending || showAnonymousDialog}
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
          disabled={(!message.trim() && attachments.length === 0) || sending || showAnonymousDialog}
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

export default SupportChatScreen;