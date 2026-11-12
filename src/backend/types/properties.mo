import Map "mo:core/Map";

module {
  public type PropertyRecord = {
    id : Text;
    data : Text;
    isDraft : Bool;
  };

  public type AnnouncementKind = { #published; #updated };
  public type Announcement = {
    propertyId : Text;
    kind : AnnouncementKind;
    data : ?Text;
  };
  public type Announcements = {
    var sequence : Nat;
    events : Map.Map<Nat, Announcement>;
  };
};
