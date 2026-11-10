import Map "mo:core/Map";

module {
  type PropertyRecord = { id : Text; data : Text; isDraft : Bool };
  type OldActor = {};
  type NewActor = { properties : Map.Map<Text, PropertyRecord> };

  public func migration(_old : OldActor) : NewActor {
    { properties = Map.empty() };
  };
};
