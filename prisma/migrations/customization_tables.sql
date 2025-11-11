-- Customization tables migration
-- Run this migration to add personalization features

-- User favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_board_id ON user_favorites(board_id);

-- User recent boards table
CREATE TABLE IF NOT EXISTS user_recent_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  access_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, board_id)
);

CREATE INDEX IF NOT EXISTS idx_user_recent_boards_user_id ON user_recent_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recent_boards_board_id ON user_recent_boards(board_id);
CREATE INDEX IF NOT EXISTS idx_user_recent_boards_last_accessed ON user_recent_boards(last_accessed_at DESC);

-- Custom views table
CREATE TABLE IF NOT EXISTS custom_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  view_type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_views_user_id ON custom_views(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_views_board_id ON custom_views(board_id);
CREATE INDEX IF NOT EXISTS idx_custom_views_user_board ON custom_views(user_id, board_id);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

