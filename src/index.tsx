import { renderRoot } from "../core";

function Test2(props: any) {
  return <div>{props.children}</div>;
}

function Test() {
  this.useCreated(() => {
    this.count = 0;
  });
  this.useMounted(() => {
    this.count++;
  });
  return (
    <div id="a1">
      {this.count}
      <button onClick={() => this.count++}>+++</button>
    </div>
  );
}

renderRoot(<Test />, document.getElementById("app"));
