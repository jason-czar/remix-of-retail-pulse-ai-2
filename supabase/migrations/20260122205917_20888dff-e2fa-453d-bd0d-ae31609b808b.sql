-- Create function to set up default watchlist for new users
CREATE OR REPLACE FUNCTION public.create_default_watchlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.watchlists (user_id, name, symbols)
  VALUES (NEW.id, 'My Watchlist', ARRAY['NVDA', 'AAPL']);
  RETURN NEW;
END;
$$;

-- Create trigger to run after new user is created
CREATE TRIGGER on_auth_user_created_watchlist
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_watchlist();