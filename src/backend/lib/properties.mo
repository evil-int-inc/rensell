import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Properties "../types/properties";

module {
  // Bound the encoded catalog page below the canister's response limit.
  let pageSize = 4;
  let maxDataBytes = 480_000;

  public func list(
    properties : Map.Map<Text, Properties.PropertyRecord>,
    after : ?Text,
    includeDrafts : Bool,
  ) : [Properties.PropertyRecord] {
    properties.entriesFrom(after ?? "").filterMap(func(id, property) =
      if (after == ?id or (property.isDraft and not includeDrafts)) { null } else { ?property }
    ).take(pageSize).toArray();
  };

  public func save(
    properties : Map.Map<Text, Properties.PropertyRecord>,
    property : Properties.PropertyRecord,
  ) : () {
    if (property.id == "" or property.id.size() > 128) {
      Runtime.trap("Property ID must contain between 1 and 128 characters");
    };
    for (c in property.id.chars()) {
      if (not ((c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or (c >= '0' and c <= '9') or c == '-' or c == '_')) {
        Runtime.trap("Property ID may contain letters, digits, hyphens, and underscores");
      };
    };
    if (property.data == "" or property.data.encodeUtf8().size() > maxDataBytes) {
      Runtime.trap("Property data must contain between 1 and 480,000 UTF-8 bytes");
    };
    properties.add(property.id, property);
  };
};
