<?php

namespace InterviewsTV\Services;

/**
 * Emoji and Reaction Management Service
 * Handles emoji support, reactions, custom emojis, and emoji parsing
 */
class EmojiService {
    private $storage;
    private $emojiCategories;
    private $customEmojis;
    private $reactionLimits;
    
    public function __construct() {
        $this->storage = new FileStorageService();
        $this->initializeEmojiCategories();
        $this->loadCustomEmojis();
        
        // Configure reaction limits
        $this->reactionLimits = [
            'max_reactions_per_message' => 20,
            'max_reactions_per_user_per_message' => 3,
            'max_unique_emojis_per_message' => 10
        ];
    }
    
    /**
     * Add reaction to a message
     */
    public function addReaction(string $messageId, string $userId, string $userName, string $emoji, string $roomId) {
        try {
            // Validate emoji
            if (!$this->isValidEmoji($emoji)) {
                throw new \Exception('Invalid emoji');
            }
            
            // Get current reactions for the message
            $reactions = $this->getMessageReactions($messageId, $roomId);
            
            // Check limits
            if (!$this->checkReactionLimits($reactions, $userId, $emoji)) {
                throw new \Exception('Reaction limits exceeded');
            }
            
            // Check if user already reacted with this emoji
            $existingReactionKey = $this->findExistingReaction($reactions, $userId, $emoji);
            
            if ($existingReactionKey !== null) {
                // Remove existing reaction (toggle off)
                unset($reactions[$existingReactionKey]);
                $action = 'removed';
            } else {
                // Add new reaction
                $reaction = [
                    'id' => uniqid('reaction_', true),
                    'user_id' => $userId,
                    'user_name' => $userName,
                    'emoji' => $emoji,
                    'emoji_unicode' => $this->getEmojiUnicode($emoji),
                    'timestamp' => time(),
                    'created_at' => date('Y-m-d H:i:s')
                ];
                
                $reactions[] = $reaction;
                $action = 'added';
            }
            
            // Re-index array
            $reactions = array_values($reactions);
            
            // Update message with new reactions
            $this->updateMessageReactions($messageId, $roomId, $reactions);
            
            // Get reaction summary
            $reactionSummary = $this->getReactionSummary($reactions);
            
            return [
                'success' => true,
                'action' => $action,
                'message_id' => $messageId,
                'user_id' => $userId,
                'emoji' => $emoji,
                'reactions' => $reactions,
                'reaction_summary' => $reactionSummary,
                'total_reactions' => count($reactions)
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get reactions for a specific message
     */
    public function getMessageReactions(string $messageId, string $roomId) {
        try {
            $messages = $this->storage->getArray('chat/messages', $roomId);
            
            foreach ($messages as $message) {
                if (($message['id'] ?? '') === $messageId) {
                    return $message['reactions'] ?? [];
                }
            }
            
            return [];
            
        } catch (\Exception $e) {
            return [];
        }
    }
    
    /**
     * Update message reactions in storage
     */
    private function updateMessageReactions(string $messageId, string $roomId, array $reactions) {
        try {
            $messages = $this->storage->getArray('chat/messages', $roomId);
            
            for ($i = 0; $i < count($messages); $i++) {
                if (($messages[$i]['id'] ?? '') === $messageId) {
                    $messages[$i]['reactions'] = $reactions;
                    $messages[$i]['reaction_count'] = count($reactions);
                    $messages[$i]['last_reaction_at'] = time();
                    break;
                }
            }
            
            $this->storage->save('chat/messages', $roomId, $messages);
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to update message reactions: " . $e->getMessage());
        }
    }
    
    /**
     * Parse emojis in message text
     */
    public function parseEmojisInMessage(string $message) {
        // Parse shortcode emojis like :smile: :heart: etc.
        $message = preg_replace_callback('/:([\w\+\-]+):/', function($matches) {
            $shortcode = $matches[1];
            $emoji = $this->getEmojiByShortcode($shortcode);
            return $emoji ? $emoji : $matches[0];
        }, $message);
        
        // Parse custom emojis like :custom_emoji_name:
        $message = preg_replace_callback('/:custom_([\w\+\-]+):/', function($matches) {
            $customName = $matches[1];
            $customEmoji = $this->getCustomEmoji($customName);
            return $customEmoji ? $customEmoji['display'] : $matches[0];
        }, $message);
        
        return $message;
    }
    
    /**
     * Get emoji categories with emojis
     */
    public function getEmojiCategories() {
        return $this->emojiCategories;
    }
    
    /**
     * Get popular/frequently used emojis
     */
    public function getPopularEmojis(string $roomId = null, int $limit = 20) {
        try {
            // Get reaction statistics
            $stats = $this->getReactionStatistics($roomId);
            
            // Sort by usage count
            uasort($stats, function($a, $b) {
                return $b['count'] - $a['count'];
            });
            
            // Return top emojis
            return array_slice(array_keys($stats), 0, $limit);
            
        } catch (\Exception $e) {
            // Return default popular emojis
            return ['😀', '😂', '❤️', '👍', '👎', '😢', '😮', '😡', '🎉', '🔥'];
        }
    }
    
    /**
     * Search emojis by keyword
     */
    public function searchEmojis(string $query, int $limit = 50) {
        $results = [];
        $query = strtolower(trim($query));
        
        if (empty($query)) {
            return $results;
        }
        
        // Search in emoji categories
        foreach ($this->emojiCategories as $category => $emojis) {
            foreach ($emojis as $emoji => $data) {
                $name = strtolower($data['name']);
                $keywords = array_map('strtolower', $data['keywords'] ?? []);
                
                if (strpos($name, $query) !== false || 
                    array_filter($keywords, function($keyword) use ($query) {
                        return strpos($keyword, $query) !== false;
                    })) {
                    $results[] = [
                        'emoji' => $emoji,
                        'name' => $data['name'],
                        'category' => $category,
                        'shortcode' => $data['shortcode'] ?? null
                    ];
                    
                    if (count($results) >= $limit) {
                        break 2;
                    }
                }
            }
        }
        
        // Search in custom emojis
        foreach ($this->customEmojis as $name => $emoji) {
            if (strpos(strtolower($name), $query) !== false) {
                $results[] = [
                    'emoji' => $emoji['display'],
                    'name' => $name,
                    'category' => 'custom',
                    'shortcode' => ":custom_{$name}:"
                ];
                
                if (count($results) >= $limit) {
                    break;
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Get reaction statistics
     */
    public function getReactionStatistics(string $roomId = null, int $timeframe = 86400) {
        try {
            $stats = [];
            $since = time() - $timeframe;
            
            if ($roomId) {
                $rooms = [$roomId];
            } else {
                // Get all rooms
                $roomFiles = glob($this->storage->getDataDir() . '/chat/messages/*.json');
                $rooms = array_map(function($file) {
                    return basename($file, '.json');
                }, $roomFiles);
            }
            
            foreach ($rooms as $room) {
                $messages = $this->storage->getArray('chat/messages', $room);
                
                foreach ($messages as $message) {
                    $reactions = $message['reactions'] ?? [];
                    
                    foreach ($reactions as $reaction) {
                        $timestamp = $reaction['timestamp'] ?? 0;
                        if ($timestamp >= $since) {
                            $emoji = $reaction['emoji'];
                            $stats[$emoji] = ($stats[$emoji] ?? ['count' => 0, 'users' => []]);
                            $stats[$emoji]['count']++;
                            $stats[$emoji]['users'][] = $reaction['user_id'];
                            $stats[$emoji]['users'] = array_unique($stats[$emoji]['users']);
                        }
                    }
                }
            }
            
            return $stats;
            
        } catch (\Exception $e) {
            return [];
        }
    }
    
    /**
     * Initialize emoji categories
     */
    private function initializeEmojiCategories() {
        $this->emojiCategories = [
            'smileys' => [
                '😀' => ['name' => 'Grinning Face', 'shortcode' => ':grinning:', 'keywords' => ['happy', 'smile', 'grin']],
                '😃' => ['name' => 'Grinning Face with Big Eyes', 'shortcode' => ':smiley:', 'keywords' => ['happy', 'smile', 'joy']],
                '😄' => ['name' => 'Grinning Face with Smiling Eyes', 'shortcode' => ':smile:', 'keywords' => ['happy', 'smile', 'laugh']],
                '😁' => ['name' => 'Beaming Face with Smiling Eyes', 'shortcode' => ':grin:', 'keywords' => ['happy', 'smile', 'beam']],
                '😆' => ['name' => 'Grinning Squinting Face', 'shortcode' => ':laughing:', 'keywords' => ['laugh', 'happy', 'funny']],
                '😅' => ['name' => 'Grinning Face with Sweat', 'shortcode' => ':sweat_smile:', 'keywords' => ['laugh', 'sweat', 'relief']],
                '🤣' => ['name' => 'Rolling on the Floor Laughing', 'shortcode' => ':rofl:', 'keywords' => ['laugh', 'funny', 'lol']],
                '😂' => ['name' => 'Face with Tears of Joy', 'shortcode' => ':joy:', 'keywords' => ['laugh', 'cry', 'funny']],
                '🙂' => ['name' => 'Slightly Smiling Face', 'shortcode' => ':slightly_smiling_face:', 'keywords' => ['smile', 'happy']],
                '🙃' => ['name' => 'Upside-Down Face', 'shortcode' => ':upside_down_face:', 'keywords' => ['silly', 'sarcasm']],
                '😉' => ['name' => 'Winking Face', 'shortcode' => ':wink:', 'keywords' => ['wink', 'flirt', 'joke']],
                '😊' => ['name' => 'Smiling Face with Smiling Eyes', 'shortcode' => ':blush:', 'keywords' => ['smile', 'happy', 'blush']],
                '😇' => ['name' => 'Smiling Face with Halo', 'shortcode' => ':innocent:', 'keywords' => ['angel', 'innocent', 'good']],
                '😍' => ['name' => 'Smiling Face with Heart-Eyes', 'shortcode' => ':heart_eyes:', 'keywords' => ['love', 'heart', 'crush']],
                '🤩' => ['name' => 'Star-Struck', 'shortcode' => ':star_struck:', 'keywords' => ['star', 'amazed', 'wow']],
                '😘' => ['name' => 'Face Blowing a Kiss', 'shortcode' => ':kissing_heart:', 'keywords' => ['kiss', 'love', 'heart']],
                '😗' => ['name' => 'Kissing Face', 'shortcode' => ':kissing:', 'keywords' => ['kiss', 'love']],
                '😚' => ['name' => 'Kissing Face with Closed Eyes', 'shortcode' => ':kissing_closed_eyes:', 'keywords' => ['kiss', 'love']],
                '😙' => ['name' => 'Kissing Face with Smiling Eyes', 'shortcode' => ':kissing_smiling_eyes:', 'keywords' => ['kiss', 'love', 'smile']],
                '😋' => ['name' => 'Face Savoring Food', 'shortcode' => ':yum:', 'keywords' => ['food', 'yum', 'delicious']],
                '😛' => ['name' => 'Face with Tongue', 'shortcode' => ':stuck_out_tongue:', 'keywords' => ['tongue', 'silly']],
                '😜' => ['name' => 'Winking Face with Tongue', 'shortcode' => ':stuck_out_tongue_winking_eye:', 'keywords' => ['tongue', 'wink', 'silly']],
                '🤪' => ['name' => 'Zany Face', 'shortcode' => ':zany_face:', 'keywords' => ['crazy', 'silly', 'wild']],
                '😝' => ['name' => 'Squinting Face with Tongue', 'shortcode' => ':stuck_out_tongue_closed_eyes:', 'keywords' => ['tongue', 'silly', 'playful']],
                '🤑' => ['name' => 'Money-Mouth Face', 'shortcode' => ':money_mouth_face:', 'keywords' => ['money', 'rich', 'dollar']],
                '🤗' => ['name' => 'Hugging Face', 'shortcode' => ':hugs:', 'keywords' => ['hug', 'love', 'care']],
                '🤭' => ['name' => 'Face with Hand Over Mouth', 'shortcode' => ':hand_over_mouth:', 'keywords' => ['secret', 'oops', 'quiet']],
                '🤫' => ['name' => 'Shushing Face', 'shortcode' => ':shushing_face:', 'keywords' => ['quiet', 'secret', 'shh']],
                '🤔' => ['name' => 'Thinking Face', 'shortcode' => ':thinking:', 'keywords' => ['think', 'consider', 'hmm']],
                '🤐' => ['name' => 'Zipper-Mouth Face', 'shortcode' => ':zipper_mouth_face:', 'keywords' => ['quiet', 'secret', 'zip']],
                '🤨' => ['name' => 'Face with Raised Eyebrow', 'shortcode' => ':raised_eyebrow:', 'keywords' => ['suspicious', 'doubt', 'skeptical']],
                '😐' => ['name' => 'Neutral Face', 'shortcode' => ':neutral_face:', 'keywords' => ['neutral', 'meh', 'blank']],
                '😑' => ['name' => 'Expressionless Face', 'shortcode' => ':expressionless:', 'keywords' => ['blank', 'meh', 'deadpan']],
                '😶' => ['name' => 'Face Without Mouth', 'shortcode' => ':no_mouth:', 'keywords' => ['quiet', 'silent', 'speechless']],
                '😏' => ['name' => 'Smirking Face', 'shortcode' => ':smirk:', 'keywords' => ['smirk', 'sly', 'smug']],
                '😒' => ['name' => 'Unamused Face', 'shortcode' => ':unamused:', 'keywords' => ['annoyed', 'meh', 'unimpressed']],
                '🙄' => ['name' => 'Face with Rolling Eyes', 'shortcode' => ':roll_eyes:', 'keywords' => ['annoyed', 'whatever', 'eye roll']],
                '😬' => ['name' => 'Grimacing Face', 'shortcode' => ':grimacing:', 'keywords' => ['awkward', 'oops', 'cringe']],
                '🤥' => ['name' => 'Lying Face', 'shortcode' => ':lying_face:', 'keywords' => ['lie', 'pinocchio', 'dishonest']],
                '😔' => ['name' => 'Pensive Face', 'shortcode' => ':pensive:', 'keywords' => ['sad', 'thoughtful', 'down']],
                '😪' => ['name' => 'Sleepy Face', 'shortcode' => ':sleepy:', 'keywords' => ['tired', 'sleep', 'sleepy']],
                '🤤' => ['name' => 'Drooling Face', 'shortcode' => ':drooling_face:', 'keywords' => ['drool', 'hungry', 'desire']],
                '😴' => ['name' => 'Sleeping Face', 'shortcode' => ':sleeping:', 'keywords' => ['sleep', 'tired', 'zzz']],
                '😷' => ['name' => 'Face with Medical Mask', 'shortcode' => ':mask:', 'keywords' => ['sick', 'mask', 'health']],
                '🤒' => ['name' => 'Face with Thermometer', 'shortcode' => ':face_with_thermometer:', 'keywords' => ['sick', 'fever', 'ill']],
                '🤕' => ['name' => 'Face with Head-Bandage', 'shortcode' => ':face_with_head_bandage:', 'keywords' => ['hurt', 'injured', 'bandage']],
                '🤢' => ['name' => 'Nauseated Face', 'shortcode' => ':nauseated_face:', 'keywords' => ['sick', 'nausea', 'gross']],
                '🤮' => ['name' => 'Face Vomiting', 'shortcode' => ':vomiting_face:', 'keywords' => ['sick', 'vomit', 'gross']],
                '🤧' => ['name' => 'Sneezing Face', 'shortcode' => ':sneezing_face:', 'keywords' => ['sick', 'sneeze', 'achoo']],
                '🥵' => ['name' => 'Hot Face', 'shortcode' => ':hot_face:', 'keywords' => ['hot', 'heat', 'sweat']],
                '🥶' => ['name' => 'Cold Face', 'shortcode' => ':cold_face:', 'keywords' => ['cold', 'freeze', 'blue']],
                '🥴' => ['name' => 'Woozy Face', 'shortcode' => ':woozy_face:', 'keywords' => ['dizzy', 'drunk', 'confused']],
                '😵' => ['name' => 'Dizzy Face', 'shortcode' => ':dizzy_face:', 'keywords' => ['dizzy', 'confused', 'knocked out']],
                '🤯' => ['name' => 'Exploding Head', 'shortcode' => ':exploding_head:', 'keywords' => ['mind blown', 'shocked', 'amazed']],
                '🤠' => ['name' => 'Cowboy Hat Face', 'shortcode' => ':cowboy_hat_face:', 'keywords' => ['cowboy', 'hat', 'western']],
                '🥳' => ['name' => 'Partying Face', 'shortcode' => ':partying_face:', 'keywords' => ['party', 'celebration', 'fun']],
                '😎' => ['name' => 'Smiling Face with Sunglasses', 'shortcode' => ':sunglasses:', 'keywords' => ['cool', 'sunglasses', 'awesome']],
                '🤓' => ['name' => 'Nerd Face', 'shortcode' => ':nerd_face:', 'keywords' => ['nerd', 'geek', 'smart']],
                '🧐' => ['name' => 'Face with Monocle', 'shortcode' => ':monocle_face:', 'keywords' => ['fancy', 'monocle', 'classy']]
            ],
            'emotions' => [
                '😢' => ['name' => 'Crying Face', 'shortcode' => ':cry:', 'keywords' => ['sad', 'cry', 'tear']],
                '😭' => ['name' => 'Loudly Crying Face', 'shortcode' => ':sob:', 'keywords' => ['sad', 'cry', 'bawl']],
                '😤' => ['name' => 'Face with Steam From Nose', 'shortcode' => ':triumph:', 'keywords' => ['angry', 'mad', 'steam']],
                '😠' => ['name' => 'Angry Face', 'shortcode' => ':angry:', 'keywords' => ['angry', 'mad', 'annoyed']],
                '😡' => ['name' => 'Pouting Face', 'shortcode' => ':rage:', 'keywords' => ['angry', 'mad', 'furious']],
                '🤬' => ['name' => 'Face with Symbols on Mouth', 'shortcode' => ':face_with_symbols_on_mouth:', 'keywords' => ['swearing', 'cursing', 'angry']],
                '😱' => ['name' => 'Face Screaming in Fear', 'shortcode' => ':scream:', 'keywords' => ['scared', 'fear', 'shock']],
                '😨' => ['name' => 'Fearful Face', 'shortcode' => ':fearful:', 'keywords' => ['scared', 'fear', 'worried']],
                '😰' => ['name' => 'Anxious Face with Sweat', 'shortcode' => ':cold_sweat:', 'keywords' => ['anxious', 'worried', 'sweat']],
                '😥' => ['name' => 'Sad but Relieved Face', 'shortcode' => ':disappointed_relieved:', 'keywords' => ['sad', 'relieved', 'phew']],
                '😓' => ['name' => 'Downcast Face with Sweat', 'shortcode' => ':sweat:', 'keywords' => ['tired', 'sweat', 'exhausted']],
                '🤗' => ['name' => 'Hugging Face', 'shortcode' => ':hugs:', 'keywords' => ['hug', 'love', 'care']],
                '🥺' => ['name' => 'Pleading Face', 'shortcode' => ':pleading_face:', 'keywords' => ['puppy eyes', 'please', 'cute']],
                '😖' => ['name' => 'Confounded Face', 'shortcode' => ':confounded:', 'keywords' => ['confused', 'frustrated', 'scrunched']],
                '😣' => ['name' => 'Persevering Face', 'shortcode' => ':persevere:', 'keywords' => ['struggling', 'persevere', 'effort']],
                '😞' => ['name' => 'Disappointed Face', 'shortcode' => ':disappointed:', 'keywords' => ['sad', 'disappointed', 'let down']],
                '😟' => ['name' => 'Worried Face', 'shortcode' => ':worried:', 'keywords' => ['worried', 'concerned', 'anxious']],
                '😕' => ['name' => 'Confused Face', 'shortcode' => ':confused:', 'keywords' => ['confused', 'puzzled', 'unsure']],
                '🙁' => ['name' => 'Slightly Frowning Face', 'shortcode' => ':slightly_frowning_face:', 'keywords' => ['sad', 'frown', 'disappointed']],
                '☹️' => ['name' => 'Frowning Face', 'shortcode' => ':frowning_face:', 'keywords' => ['sad', 'frown', 'unhappy']],
                '😮' => ['name' => 'Face with Open Mouth', 'shortcode' => ':open_mouth:', 'keywords' => ['surprised', 'shocked', 'wow']],
                '😯' => ['name' => 'Hushed Face', 'shortcode' => ':hushed:', 'keywords' => ['quiet', 'surprised', 'shh']],
                '😲' => ['name' => 'Astonished Face', 'shortcode' => ':astonished:', 'keywords' => ['shocked', 'surprised', 'amazed']],
                '😳' => ['name' => 'Flushed Face', 'shortcode' => ':flushed:', 'keywords' => ['embarrassed', 'shy', 'blushing']],
                '🥱' => ['name' => 'Yawning Face', 'shortcode' => ':yawning_face:', 'keywords' => ['tired', 'sleepy', 'bored']]
            ],
            'gestures' => [
                '👍' => ['name' => 'Thumbs Up', 'shortcode' => ':+1:', 'keywords' => ['thumbs up', 'good', 'yes', 'approve']],
                '👎' => ['name' => 'Thumbs Down', 'shortcode' => ':-1:', 'keywords' => ['thumbs down', 'bad', 'no', 'disapprove']],
                '👌' => ['name' => 'OK Hand', 'shortcode' => ':ok_hand:', 'keywords' => ['ok', 'good', 'perfect']],
                '✌️' => ['name' => 'Victory Hand', 'shortcode' => ':v:', 'keywords' => ['peace', 'victory', 'two']],
                '🤞' => ['name' => 'Crossed Fingers', 'shortcode' => ':crossed_fingers:', 'keywords' => ['luck', 'hope', 'wish']],
                '🤟' => ['name' => 'Love-You Gesture', 'shortcode' => ':love_you_gesture:', 'keywords' => ['love', 'rock', 'sign']],
                '🤘' => ['name' => 'Sign of the Horns', 'shortcode' => ':metal:', 'keywords' => ['rock', 'metal', 'horns']],
                '🤙' => ['name' => 'Call Me Hand', 'shortcode' => ':call_me_hand:', 'keywords' => ['call', 'phone', 'hang loose']],
                '👈' => ['name' => 'Backhand Index Pointing Left', 'shortcode' => ':point_left:', 'keywords' => ['point', 'left', 'direction']],
                '👉' => ['name' => 'Backhand Index Pointing Right', 'shortcode' => ':point_right:', 'keywords' => ['point', 'right', 'direction']],
                '👆' => ['name' => 'Backhand Index Pointing Up', 'shortcode' => ':point_up_2:', 'keywords' => ['point', 'up', 'direction']],
                '👇' => ['name' => 'Backhand Index Pointing Down', 'shortcode' => ':point_down:', 'keywords' => ['point', 'down', 'direction']],
                '☝️' => ['name' => 'Index Pointing Up', 'shortcode' => ':point_up:', 'keywords' => ['point', 'up', 'one']],
                '✋' => ['name' => 'Raised Hand', 'shortcode' => ':raised_hand:', 'keywords' => ['hand', 'stop', 'high five']],
                '🤚' => ['name' => 'Raised Back of Hand', 'shortcode' => ':raised_back_of_hand:', 'keywords' => ['hand', 'stop', 'back']],
                '🖐️' => ['name' => 'Hand with Fingers Splayed', 'shortcode' => ':raised_hand_with_fingers_splayed:', 'keywords' => ['hand', 'five', 'stop']],
                '🖖' => ['name' => 'Vulcan Salute', 'shortcode' => ':vulcan_salute:', 'keywords' => ['spock', 'star trek', 'vulcan']],
                '👋' => ['name' => 'Waving Hand', 'shortcode' => ':wave:', 'keywords' => ['wave', 'hello', 'goodbye']],
                '🤏' => ['name' => 'Pinching Hand', 'shortcode' => ':pinching_hand:', 'keywords' => ['small', 'tiny', 'pinch']],
                '👏' => ['name' => 'Clapping Hands', 'shortcode' => ':clap:', 'keywords' => ['clap', 'applause', 'good job']],
                '🙌' => ['name' => 'Raising Hands', 'shortcode' => ':raised_hands:', 'keywords' => ['celebration', 'hooray', 'praise']],
                '👐' => ['name' => 'Open Hands', 'shortcode' => ':open_hands:', 'keywords' => ['open', 'hug', 'jazz hands']],
                '🤲' => ['name' => 'Palms Up Together', 'shortcode' => ':palms_up_together:', 'keywords' => ['prayer', 'please', 'open']],
                '🤝' => ['name' => 'Handshake', 'shortcode' => ':handshake:', 'keywords' => ['handshake', 'deal', 'agreement']],
                '🙏' => ['name' => 'Folded Hands', 'shortcode' => ':pray:', 'keywords' => ['prayer', 'please', 'thank you']],
                '✍️' => ['name' => 'Writing Hand', 'shortcode' => ':writing_hand:', 'keywords' => ['write', 'pen', 'signature']],
                '💪' => ['name' => 'Flexed Biceps', 'shortcode' => ':muscle:', 'keywords' => ['strong', 'muscle', 'flex']],
                '🦾' => ['name' => 'Mechanical Arm', 'shortcode' => ':mechanical_arm:', 'keywords' => ['robot', 'cyborg', 'prosthetic']],
                '🦿' => ['name' => 'Mechanical Leg', 'shortcode' => ':mechanical_leg:', 'keywords' => ['robot', 'cyborg', 'prosthetic']],
                '🦵' => ['name' => 'Leg', 'shortcode' => ':leg:', 'keywords' => ['leg', 'kick', 'limb']],
                '🦶' => ['name' => 'Foot', 'shortcode' => ':foot:', 'keywords' => ['foot', 'kick', 'step']],
                '👂' => ['name' => 'Ear', 'shortcode' => ':ear:', 'keywords' => ['ear', 'listen', 'hear']],
                '🦻' => ['name' => 'Ear with Hearing Aid', 'shortcode' => ':ear_with_hearing_aid:', 'keywords' => ['hearing aid', 'deaf', 'accessibility']],
                '👃' => ['name' => 'Nose', 'shortcode' => ':nose:', 'keywords' => ['nose', 'smell', 'sniff']],
                '🧠' => ['name' => 'Brain', 'shortcode' => ':brain:', 'keywords' => ['brain', 'smart', 'think']],
                '🦷' => ['name' => 'Tooth', 'shortcode' => ':tooth:', 'keywords' => ['tooth', 'dental', 'smile']],
                '🦴' => ['name' => 'Bone', 'shortcode' => ':bone:', 'keywords' => ['bone', 'skeleton', 'dog']],
                '👀' => ['name' => 'Eyes', 'shortcode' => ':eyes:', 'keywords' => ['eyes', 'look', 'see']],
                '👁️' => ['name' => 'Eye', 'shortcode' => ':eye:', 'keywords' => ['eye', 'look', 'see']],
                '👅' => ['name' => 'Tongue', 'shortcode' => ':tongue:', 'keywords' => ['tongue', 'taste', 'lick']],
                '👄' => ['name' => 'Mouth', 'shortcode' => ':lips:', 'keywords' => ['lips', 'mouth', 'kiss']]
            ],
            'hearts' => [
                '❤️' => ['name' => 'Red Heart', 'shortcode' => ':heart:', 'keywords' => ['love', 'heart', 'red']],
                '🧡' => ['name' => 'Orange Heart', 'shortcode' => ':orange_heart:', 'keywords' => ['love', 'heart', 'orange']],
                '💛' => ['name' => 'Yellow Heart', 'shortcode' => ':yellow_heart:', 'keywords' => ['love', 'heart', 'yellow']],
                '💚' => ['name' => 'Green Heart', 'shortcode' => ':green_heart:', 'keywords' => ['love', 'heart', 'green']],
                '💙' => ['name' => 'Blue Heart', 'shortcode' => ':blue_heart:', 'keywords' => ['love', 'heart', 'blue']],
                '💜' => ['name' => 'Purple Heart', 'shortcode' => ':purple_heart:', 'keywords' => ['love', 'heart', 'purple']],
                '🖤' => ['name' => 'Black Heart', 'shortcode' => ':black_heart:', 'keywords' => ['love', 'heart', 'black']],
                '🤍' => ['name' => 'White Heart', 'shortcode' => ':white_heart:', 'keywords' => ['love', 'heart', 'white']],
                '🤎' => ['name' => 'Brown Heart', 'shortcode' => ':brown_heart:', 'keywords' => ['love', 'heart', 'brown']],
                '💔' => ['name' => 'Broken Heart', 'shortcode' => ':broken_heart:', 'keywords' => ['broken', 'heart', 'sad']],
                '❣️' => ['name' => 'Heart Exclamation', 'shortcode' => ':heavy_heart_exclamation:', 'keywords' => ['love', 'heart', 'exclamation']],
                '💕' => ['name' => 'Two Hearts', 'shortcode' => ':two_hearts:', 'keywords' => ['love', 'hearts', 'two']],
                '💞' => ['name' => 'Revolving Hearts', 'shortcode' => ':revolving_hearts:', 'keywords' => ['love', 'hearts', 'revolving']],
                '💓' => ['name' => 'Beating Heart', 'shortcode' => ':heartbeat:', 'keywords' => ['love', 'heart', 'beat']],
                '💗' => ['name' => 'Growing Heart', 'shortcode' => ':heartpulse:', 'keywords' => ['love', 'heart', 'growing']],
                '💖' => ['name' => 'Sparkling Heart', 'shortcode' => ':sparkling_heart:', 'keywords' => ['love', 'heart', 'sparkle']],
                '💘' => ['name' => 'Heart with Arrow', 'shortcode' => ':cupid:', 'keywords' => ['love', 'heart', 'arrow', 'cupid']],
                '💝' => ['name' => 'Heart with Ribbon', 'shortcode' => ':gift_heart:', 'keywords' => ['love', 'heart', 'gift']],
                '💟' => ['name' => 'Heart Decoration', 'shortcode' => ':heart_decoration:', 'keywords' => ['love', 'heart', 'decoration']]
            ],
            'objects' => [
                '🔥' => ['name' => 'Fire', 'shortcode' => ':fire:', 'keywords' => ['fire', 'hot', 'flame']],
                '⭐' => ['name' => 'Star', 'shortcode' => ':star:', 'keywords' => ['star', 'favorite', 'awesome']],
                '🌟' => ['name' => 'Glowing Star', 'shortcode' => ':star2:', 'keywords' => ['star', 'glowing', 'sparkle']],
                '✨' => ['name' => 'Sparkles', 'shortcode' => ':sparkles:', 'keywords' => ['sparkle', 'magic', 'shine']],
                '🎉' => ['name' => 'Party Popper', 'shortcode' => ':tada:', 'keywords' => ['party', 'celebration', 'confetti']],
                '🎊' => ['name' => 'Confetti Ball', 'shortcode' => ':confetti_ball:', 'keywords' => ['party', 'celebration', 'confetti']],
                '💯' => ['name' => 'Hundred Points', 'shortcode' => ':100:', 'keywords' => ['hundred', 'perfect', 'score']],
                '💢' => ['name' => 'Anger Symbol', 'shortcode' => ':anger:', 'keywords' => ['angry', 'mad', 'symbol']],
                '💥' => ['name' => 'Collision', 'shortcode' => ':boom:', 'keywords' => ['explosion', 'bang', 'collision']],
                '💫' => ['name' => 'Dizzy', 'shortcode' => ':dizzy:', 'keywords' => ['dizzy', 'stars', 'confused']],
                '💦' => ['name' => 'Sweat Droplets', 'shortcode' => ':sweat_drops:', 'keywords' => ['sweat', 'water', 'drops']],
                '💨' => ['name' => 'Dashing Away', 'shortcode' => ':dash:', 'keywords' => ['fast', 'speed', 'wind']],
                '🕳️' => ['name' => 'Hole', 'shortcode' => ':hole:', 'keywords' => ['hole', 'empty', 'void']],
                '💣' => ['name' => 'Bomb', 'shortcode' => ':bomb:', 'keywords' => ['bomb', 'explosive', 'danger']],
                '💤' => ['name' => 'Zzz', 'shortcode' => ':zzz:', 'keywords' => ['sleep', 'tired', 'zzz']],
                '👑' => ['name' => 'Crown', 'shortcode' => ':crown:', 'keywords' => ['crown', 'king', 'royal']],
                '🎯' => ['name' => 'Direct Hit', 'shortcode' => ':dart:', 'keywords' => ['target', 'bullseye', 'accurate']],
                '🎪' => ['name' => 'Circus Tent', 'shortcode' => ':circus_tent:', 'keywords' => ['circus', 'tent', 'fun']],
                '🎭' => ['name' => 'Performing Arts', 'shortcode' => ':performing_arts:', 'keywords' => ['theater', 'drama', 'masks']],
                '🎨' => ['name' => 'Artist Palette', 'shortcode' => ':art:', 'keywords' => ['art', 'paint', 'creative']],
                '🎬' => ['name' => 'Clapper Board', 'shortcode' => ':clapper:', 'keywords' => ['movie', 'film', 'action']],
                '🎤' => ['name' => 'Microphone', 'shortcode' => ':microphone:', 'keywords' => ['microphone', 'sing', 'karaoke']],
                '🎧' => ['name' => 'Headphone', 'shortcode' => ':headphones:', 'keywords' => ['headphones', 'music', 'listen']],
                '🎵' => ['name' => 'Musical Note', 'shortcode' => ':musical_note:', 'keywords' => ['music', 'note', 'sound']],
                '🎶' => ['name' => 'Musical Notes', 'shortcode' => ':notes:', 'keywords' => ['music', 'notes', 'sound']],
                '🎼' => ['name' => 'Musical Score', 'shortcode' => ':musical_score:', 'keywords' => ['music', 'score', 'sheet']],
                '🎹' => ['name' => 'Musical Keyboard', 'shortcode' => ':musical_keyboard:', 'keywords' => ['piano', 'keyboard', 'music']],
                '🥁' => ['name' => 'Drum', 'shortcode' => ':drum:', 'keywords' => ['drum', 'music', 'beat']],
                '🎷' => ['name' => 'Saxophone', 'shortcode' => ':saxophone:', 'keywords' => ['saxophone', 'music', 'jazz']],
                '🎺' => ['name' => 'Trumpet', 'shortcode' => ':trumpet:', 'keywords' => ['trumpet', 'music', 'brass']],
                '🎸' => ['name' => 'Guitar', 'shortcode' => ':guitar:', 'keywords' => ['guitar', 'music', 'rock']],
                '🎻' => ['name' => 'Violin', 'shortcode' => ':violin:', 'keywords' => ['violin', 'music', 'classical']]
            ]
        ];
    }
    
    /**
     * Load custom emojis from storage
     */
    private function loadCustomEmojis() {
        try {
            $this->customEmojis = $this->storage->load('chat/custom_emojis', 'global') ?? [];
        } catch (\Exception $e) {
            $this->customEmojis = [];
        }
    }
    
    /**
     * Check if emoji is valid
     */
    private function isValidEmoji(string $emoji) {
        // Check standard emojis
        foreach ($this->emojiCategories as $category => $emojis) {
            if (isset($emojis[$emoji])) {
                return true;
            }
        }
        
        // Check custom emojis
        foreach ($this->customEmojis as $customEmoji) {
            if ($customEmoji['display'] === $emoji) {
                return true;
            }
        }
        
        // Check if it's a valid Unicode emoji (basic check)
        return preg_match('/[\x{1F600}-\x{1F64F}]|[\x{1F300}-\x{1F5FF}]|[\x{1F680}-\x{1F6FF}]|[\x{1F1E0}-\x{1F1FF}]|[\x{2600}-\x{26FF}]|[\x{2700}-\x{27BF}]/u', $emoji);
    }
    
    /**
     * Get emoji by shortcode
     */
    private function getEmojiByShortcode(string $shortcode) {
        foreach ($this->emojiCategories as $category => $emojis) {
            foreach ($emojis as $emoji => $data) {
                if (($data['shortcode'] ?? '') === ":$shortcode:") {
                    return $emoji;
                }
            }
        }
        return null;
    }
    
    /**
     * Get custom emoji by name
     */
    private function getCustomEmoji(string $name) {
        return $this->customEmojis[$name] ?? null;
    }
    
    /**
     * Get emoji Unicode representation
     */
    private function getEmojiUnicode(string $emoji) {
        return bin2hex(mb_convert_encoding($emoji, 'UTF-32', 'UTF-8'));
    }
    
    /**
     * Check reaction limits
     */
    private function checkReactionLimits(array $reactions, string $userId, string $emoji) {
        $totalReactions = count($reactions);
        $userReactions = array_filter($reactions, function($r) use ($userId) {
            return $r['user_id'] === $userId;
        });
        $userReactionCount = count($userReactions);
        
        $uniqueEmojis = array_unique(array_column($reactions, 'emoji'));
        $uniqueEmojiCount = count($uniqueEmojis);
        
        // Check limits
        if ($totalReactions >= $this->reactionLimits['max_reactions_per_message']) {
            return false;
        }
        
        if ($userReactionCount >= $this->reactionLimits['max_reactions_per_user_per_message']) {
            return false;
        }
        
        if (!in_array($emoji, $uniqueEmojis) && $uniqueEmojiCount >= $this->reactionLimits['max_unique_emojis_per_message']) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Find existing reaction by user and emoji
     */
    private function findExistingReaction(array $reactions, string $userId, string $emoji) {
        foreach ($reactions as $key => $reaction) {
            if ($reaction['user_id'] === $userId && $reaction['emoji'] === $emoji) {
                return $key;
            }
        }
        return null;
    }
    
    /**
     * Get reaction summary (grouped by emoji)
     */
    private function getReactionSummary(array $reactions) {
        $summary = [];
        
        foreach ($reactions as $reaction) {
            $emoji = $reaction['emoji'];
            if (!isset($summary[$emoji])) {
                $summary[$emoji] = [
                    'emoji' => $emoji,
                    'count' => 0,
                    'users' => []
                ];
            }
            
            $summary[$emoji]['count']++;
            $summary[$emoji]['users'][] = [
                'user_id' => $reaction['user_id'],
                'user_name' => $reaction['user_name']
            ];
        }
        
        return array_values($summary);
    }
}
