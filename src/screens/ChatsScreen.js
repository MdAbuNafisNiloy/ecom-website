import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  Divider, 
  Badge,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Paper
} from '@mui/material';
import { 
  Search as SearchIcon,
  Circle as CircleIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import pb from '../pocketbase';
import { useUser } from '../contexts/UserContext';

// Styled components
const ChatListContainer = styled(Paper)(({ theme }) => ({
  maxWidth: 600,
  margin: '0 auto',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      content: '""',
    },
  },
}));

const UnreadDot = styled(CircleIcon)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.primary.main,
}));

const SearchBar = styled(TextField)(({ theme }) => ({
  margin: theme.spacing(2),
}));

const EmptyStateContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
  flex: 1,
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  width: '100%',
}));

const UnreadIndicator = styled(Box)(({ theme }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: theme.palette.error.main,
  marginRight: theme.spacing(1),
  boxShadow: '0 0 4px rgba(255,0,0,0.5)',
}));

const UnreadListItem = styled(ListItem)(({ theme, hasUnread }) => ({
  borderLeft: hasUnread ? `4px solid ${theme.palette.error.main}` : '4px solid transparent',
  backgroundColor: hasUnread ? 'rgba(255, 0, 0, 0.05)' : 'transparent',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: hasUnread ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.04)',
  },
}));

const UnreadBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.error.main,
    color: 'white',
    fontWeight: 'bold',
    minWidth: '20px',
    height: '20px',
  },
}));

const ChatsScreen = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sellerInfo, setSellerInfo] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  
  // Load conversation data
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get all conversations grouped by seller
        const result = await pb.collection('seller_chat').getList(1, 50, {
          filter: `user = "${user.id}"`,
          sort: '-created',
          expand: 'seller'
        });
        
        // Group messages by seller
        const sellerGroups = {};
        const sellerIds = new Set();
        const unreadMessageCounts = {};
        let totalUnread = 0;
        
        result.items.forEach(message => {
          const sellerId = message.seller;
          
          // Initialize the group if it doesn't exist
          if (!sellerGroups[sellerId]) {
            sellerGroups[sellerId] = {
              sellerId,
              messages: [],
              lastMessage: null,
              lastMessageTime: null,
              sellerData: message.expand?.seller || null
            };
          }
          
          // Add message to seller group
          sellerGroups[sellerId].messages.push(message);
          
          // Update last message info if this is newer
          const messageTime = new Date(message.created).getTime();
          if (!sellerGroups[sellerId].lastMessageTime || messageTime > sellerGroups[sellerId].lastMessageTime) {
            sellerGroups[sellerId].lastMessage = message;
            sellerGroups[sellerId].lastMessageTime = messageTime;
          }
          
          // Track unread messages (only count messages from seller to user that are unread)
          if (message.sender === 'seller' && !message.read_status) {
            unreadMessageCounts[sellerId] = (unreadMessageCounts[sellerId] || 0) + 1;
            totalUnread++;
          }
          
          sellerIds.add(sellerId);
        });
        
        // Convert to array and sort by most recent message
        const conversationArray = Object.values(sellerGroups);
        conversationArray.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        
        setConversations(conversationArray);
        setUnreadCounts(unreadMessageCounts);
        setTotalUnreadMessages(totalUnread);
        
        // Fetch seller info for any missing sellers
        const sellersToFetch = Array.from(sellerIds).filter(id => !sellerGroups[id].sellerData);
        
        if (sellersToFetch.length > 0) {
          const sellers = await Promise.all(
            sellersToFetch.map(id => 
              pb.collection('sellers').getOne(id).catch(err => {
                console.error(`Error fetching seller ${id}:`, err);
                return null;
              })
            )
          );
          
          // Update seller info
          const sellerInfoMap = {};
          sellers.forEach(seller => {
            if (seller) {
              sellerInfoMap[seller.id] = seller;
            }
          });
          
          setSellerInfo(sellerInfoMap);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
    
    // Set up real-time subscription for new messages
    if (user) {
      const subscription = pb.collection('seller_chat').subscribe('*', async ({ action, record }) => {
        if ((action === 'create' || action === 'update') && record.user === user.id) {
          // Refresh the conversation list
          fetchConversations();
        }
      });
      
      return () => {
        pb.collection('seller_chat').unsubscribe(subscription);
      };
    }
  }, [user]);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();
    
    if (isToday) {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } else if (isThisYear) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    }
  };

  // Format message preview
  const getMessagePreview = (message) => {
    if (!message) return '';
    
    if (message.message && message.message.trim()) {
      return message.message.length > 30 
        ? message.message.substring(0, 30) + '...' 
        : message.message;
    } else if (message.attachment && message.attachment.length > 0) {
      return message.sender === 'user' 
        ? 'You sent an attachment' 
        : 'Sent you an attachment';
    }
    
    return 'No message';
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    const sellerData = conversation.sellerData || sellerInfo[conversation.sellerId] || {};
    const shopName = sellerData.shop_name || 'Unknown Seller';
    
    return shopName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Navigate to message screen for a seller
  const handleOpenChat = (sellerId) => {
    navigate(`/message/${sellerId}`);
  };

  if (!user) {
    return (
      <EmptyStateContainer>
        <Typography variant="h6">
          Please log in to view your messages
        </Typography>
      </EmptyStateContainer>
    );
  }

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress />
      </LoadingContainer>
    );
  }

  return (
    <ChatListContainer elevation={0}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="h6" fontWeight="bold">
          Messages
        </Typography>
      </Box>
      
      <SearchBar
        fullWidth
        size="small"
        placeholder="Search conversations"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton 
                size="small"
                onClick={() => setSearchQuery('')}
                edge="end"
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
      
      {filteredConversations.length === 0 ? (
        <EmptyStateContainer>
          {searchQuery ? (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                No conversations match your search
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try a different search term
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                You have no conversations yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start shopping to connect with sellers
              </Typography>
            </>
          )}
        </EmptyStateContainer>
      ) : (
        <List sx={{ flex: 1, overflow: 'auto', px: 0 }} disablePadding>
          {filteredConversations.map((conversation) => {
            const { sellerId, lastMessage, sellerData } = conversation;
            const seller = sellerData || sellerInfo[sellerId] || {};
            const sellerName = seller.shop_name || 'Unknown Seller';
            const messageTime = lastMessage ? formatTime(lastMessage.created) : '';
            const messagePreview = getMessagePreview(lastMessage);
            const hasUnread = unreadCounts[sellerId] > 0;
            const isVerified = seller.admin_verified;
            
            return (
              <React.Fragment key={sellerId}>
                <UnreadListItem 
                  button 
                  alignItems="flex-start"
                  onClick={() => handleOpenChat(sellerId)}
                  hasUnread={hasUnread}
                  sx={{ 
                    py: 1.5,
                    px: 2,
                    backgroundColor: hasUnread ? 'rgba(255, 0, 0, 0.05)' : 'transparent',
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={hasUnread ? (
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            bgcolor: 'error.main',
                            border: '2px solid white' 
                          }}
                        />
                      ) : null}
                    >
                      <Avatar 
                        src={seller.shop_logo ? pb.files.getUrl(seller, seller.shop_logo) : undefined}
                        alt={sellerName}
                        sx={{
                          border: hasUnread ? '2px solid #ff0000' : 'none',
                        }}
                      >
                        {!seller.shop_logo && sellerName.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          variant="subtitle1" 
                          component="span" 
                          fontWeight={hasUnread ? 700 : 400}
                          sx={{ 
                            color: hasUnread ? 'error.main' : 'text.primary',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {hasUnread && (
                            <Box 
                              component="span" 
                              sx={{ 
                                display: 'inline-block',
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                bgcolor: 'error.main',
                                mr: 1,
                                animation: hasUnread ? 'pulse 1.5s infinite' : 'none',
                                '@keyframes pulse': {
                                  '0%': { boxShadow: '0 0 0 0 rgba(255, 0, 0, 0.7)' },
                                  '70%': { boxShadow: '0 0 0 5px rgba(255, 0, 0, 0)' },
                                  '100%': { boxShadow: '0 0 0 0 rgba(255, 0, 0, 0)' },
                                },
                              }}
                            />
                          )}
                          {sellerName}
                          {isVerified && ' ✓'}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={hasUnread ? "error.main" : "text.secondary"}
                          component="span"
                          fontWeight={hasUnread ? 600 : 400}
                        >
                          {messageTime}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                          variant="body2"
                          color={hasUnread ? "error.main" : "text.primary"}
                          fontWeight={hasUnread ? 500 : 400}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px',
                          }}
                        >
                          {lastMessage?.sender === 'user' && 'You: '}{messagePreview}
                        </Typography>
                        
                        {hasUnread && (
                          <UnreadBadge
                            badgeContent={unreadCounts[sellerId]}
                            color="error"
                            sx={{ 
                              ml: 1,
                              '& .MuiBadge-badge': {
                                animation: 'bounce 0.5s ease infinite alternate',
                              },
                              '@keyframes bounce': {
                                to: {
                                  transform: 'scale(1.1)',
                                },
                              },
                            }}
                          />
                        )}
                      </Box>
                    }
                  />
                </UnreadListItem>
                <Divider component="li" />
              </React.Fragment>
            );
          })}
        </List>
      )}
    </ChatListContainer>
  );
};

export default ChatsScreen;