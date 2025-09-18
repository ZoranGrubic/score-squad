-- Function to calculate points for user predictions based on match results
-- This function will be called whenever a match score is updated

CREATE OR REPLACE FUNCTION calculate_prediction_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate points for finished matches with scores
    IF NEW.status = 'FINISHED' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN

        -- Update points for all predictions on this match
        UPDATE user_predictions
        SET points_earned = (
            CASE
                -- Exact score match: 3 points
                WHEN home_score = NEW.home_score AND away_score = NEW.away_score THEN 3

                -- Correct winner prediction: 1 point
                WHEN (
                    -- Predicted home win and home actually won
                    (predicted_winner = 'home' AND NEW.home_score > NEW.away_score) OR
                    -- Predicted away win and away actually won
                    (predicted_winner = 'away' AND NEW.away_score > NEW.home_score) OR
                    -- Predicted draw and it was actually a draw
                    (predicted_winner = 'draw' AND NEW.home_score = NEW.away_score)
                ) THEN 1

                -- Wrong prediction: 0 points
                ELSE 0
            END
        ),
        updated_at = NOW()
        WHERE match_id = NEW.id;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate points when match scores are updated
DROP TRIGGER IF EXISTS trigger_calculate_prediction_points ON matches;
CREATE TRIGGER trigger_calculate_prediction_points
    AFTER UPDATE ON matches
    FOR EACH ROW
    WHEN (OLD.home_score IS DISTINCT FROM NEW.home_score OR
          OLD.away_score IS DISTINCT FROM NEW.away_score OR
          OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION calculate_prediction_points();

-- Create index to speed up predictions lookup by match_id
CREATE INDEX IF NOT EXISTS idx_user_predictions_match_id ON user_predictions(match_id);