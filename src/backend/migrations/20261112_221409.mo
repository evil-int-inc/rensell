import Map "mo:core/Map";

module {
  type Announcement = {
    propertyId : Text;
    kind : { #published; #updated };
    data : ?Text;
  };
  type TelegramConfigState = { var clientId : ?Text };
  type OldActor = { telegramConfig : TelegramConfigState };
  type NewActor = {
    propertyAnnouncements : { var sequence : Nat; events : Map.Map<Nat, Announcement> };
    telegramConfig : TelegramConfigState;
  };

  public func migration(old : OldActor) : NewActor {
    // Replace the old seeded bot ID while preserving admin settings.
    let clientId = switch (old.telegramConfig.clientId) {
      case (?"8851986381") { ?"9165452815" };
      case (current) { current };
    };
    {
      propertyAnnouncements = { var sequence = 0; events = Map.empty() };
      telegramConfig = { var clientId };
    };
  };
};
