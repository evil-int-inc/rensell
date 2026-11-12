import Array "mo:core/Array";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Json "mo:json";
import Properties "../types/properties";

module {
  // Keep recent saves available through worker restarts without retaining an
  // unbounded history of earlier versions and their photos.
  let retained = 128;
  let pageSize = 4;
  let path = "/api/listing-announcements";

  public type Request = { method : Text; url : Text; headers : [(Text, Text)]; body : Blob };
  public type QueryRequest = Request and { certificate_version : ?Nat16 };
  public type Response = {
    status_code : Nat16;
    headers : [(Text, Text)];
    body : Blob;
    upgrade : ?Bool;
  };

  public func recordChange(
    state : Properties.Announcements,
    previous : ?Properties.PropertyRecord,
    property : Properties.PropertyRecord,
  ) {
    if (property.isDraft) {
      withdraw(state, property.id);
      return;
    };
    let kind = switch (previous) {
      case (?old) {
        if (old.isDraft) { #published } else {
          if (old.data == property.data) { return };
          #updated;
        };
      };
      case null { #published };
    };
    state.sequence += 1;
    let sequence = state.sequence;
    state.events.add(sequence, {
      propertyId = property.id;
      kind;
      data = ?property.data;
    });
    if (sequence > retained) { state.events.remove(Int.abs(sequence - retained)) };
  };

  public func withdraw(state : Properties.Announcements, propertyId : Text) {
    // Preserve cursors, but remove the snapshots when the listing is withdrawn.
    for ((sequence, event) in state.events.entries().toArray().values()) {
      if (event.propertyId == propertyId and event.data != null) {
        state.events.add(sequence, { event with data = null });
      };
    };
  };

  func finiteNumber(value : Json.Json) : Bool {
    switch (value) {
      case (#number(#int _)) { true };
      case (#number(#float number)) { number - number == 0.0 };
      case _ { false };
    };
  };

  func listing(event : Properties.Announcement) : Json.Json {
    let ?data = event.data else return Json.nullable();
    let #ok(#object_ fields) = Json.parse(data) else return Json.nullable();
    let details = fields.filterMap(func((key, value)) {
      switch (key, value) {
        case ("images", #array images) {
          if (images.size() == 0) { return null };
          let #string cover = images[0] else return null;
          ?(key, Json.arr([Json.str(cover)]));
        };
        case ("title" or "description" or "type" or "address" or "city" or "neighborhood", #string _) {
          ?(key, value);
        };
        case ("price" or "areaM2" or "rooms" or "floor" or "totalFloors", _) {
          if (finiteNumber(value)) { ?(key, value) } else { null };
        };
        case ("coordinates", #object_ coordinates) {
          ?(key, Json.obj(coordinates.filter(func((axis, number)) {
            (axis == "latitude" or axis == "longitude") and finiteNumber(number);
          })));
        };
        case _ { null };
      };
    });
    Json.obj([("id", Json.str(event.propertyId))].concat(details));
  };

  func after(request : Request) : ?Nat {
    if (request.method != "GET") { return null };
    if (request.url == path) { return ?0 };
    let ?value = request.url.stripStart(#text(path # "?after=")) else return null;
    if (value.size() == 0 or value.size() > 18) { return null };
    for (character in value.chars()) {
      if (character < '0' or character > '9') { return null };
    };
    Nat.fromText(value);
  };

  func response(status : Nat16, body : Text, upgrade : ?Bool) : Response {
    {
      status_code = status;
      headers = [("Content-Type", "application/json; charset=utf-8"), ("Cache-Control", "no-store")];
      body = body.encodeUtf8();
      upgrade;
    };
  };

  public func upgradeRequest(request : QueryRequest) : Response {
    switch (after(request)) {
      case (?_) { response(200, "", ?true) };
      case null { response(404, "{\"error\":\"Not found\"}", null) };
    };
  };

  public func feed(state : Properties.Announcements, request : Request) : Response {
    let ?cursor = after(request) else return response(404, "{\"error\":\"Not found\"}", null);
    let events = state.events.entriesFrom(cursor + 1).take(pageSize).map(func(sequence, event) {
      let kind = switch (event.kind) { case (#published) { "published" }; case (#updated) { "updated" } };
      Json.obj([
        ("sequence", Json.int(sequence)),
        ("kind", Json.str(kind)),
        ("listing", listing(event)),
      ]);
    }).toArray();
    response(200, Json.stringify(Json.obj([("events", Json.arr(events))]), null), null);
  };
};
